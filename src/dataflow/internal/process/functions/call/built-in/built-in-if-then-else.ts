import type { DataflowProcessorInformation } from '../../../../../processor'
import { processDataflowFor } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import { alwaysExits } from '../../../../../info'
import { processKnownFunctionCall } from '../known-call-handling'
import { patchFunctionCall } from '../common'
import { unpackArgument } from '../argument/unpack-argument'
import type { RSymbol } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import type { ParentInformation } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RFunctionArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { NodeId } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/node-id'
import { dataflowLogger } from '../../../../../logger'
import { resolvesToBuiltInConstant } from '../../../../../environments/resolve-by-name'
import { EdgeType } from '../../../../../graph/edge'
import { appendEnvironment } from '../../../../../environments/append'
import type { IdentifierReference } from '../../../../../environments/identifier'
import { makeAllMaybe } from '../../../../../environments/environment'

export function processIfThenElse<OtherInfo>(
	name:   RSymbol<OtherInfo & ParentInformation>,
	args:   readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data:   DataflowProcessorInformation<OtherInfo & ParentInformation>
): DataflowInformation {
	if(args.length !== 2 && args.length !== 3) {
		dataflowLogger.warn(`If-then-else ${name.content} has something different from 2 or 3 arguments, skipping`)
		return processKnownFunctionCall({ name, args, rootId, data }).information
	}

	const [condArg, thenArg, otherwiseArg] = args.map(unpackArgument)

	if(condArg === undefined || thenArg === undefined) {
		dataflowLogger.warn(`If-then-else ${name.content} has empty condition or then case in ${JSON.stringify(args)}, skipping`)
		return processKnownFunctionCall({ name, args, rootId, data }).information
	}

	const cond = processDataflowFor(condArg, data)

	if(alwaysExits(cond)) {
		dataflowLogger.warn(`If-then-else ${rootId} forces exit in condition, skipping rest`)
		return cond
	}

	const originalDependency = data.controlDependencies
	// currently we update the cd afterward :sweat:
	data = { ...data, environment: cond.environment }

	let then: DataflowInformation | undefined
	let makeThenMaybe = false

	// we should defer this to the abstract interpretation
	const conditionIsFalse = resolvesToBuiltInConstant(condArg?.lexeme, data.environment, false)
	const conditionIsTrue = resolvesToBuiltInConstant(condArg?.lexeme, data.environment, true)
	if(conditionIsFalse !== 'always') {
		then = processDataflowFor(thenArg, data)
		if(then.entryPoint) {
			then.graph.addEdge(name.info.id, then.entryPoint, { type: EdgeType.Returns })
		}
		if(conditionIsTrue !== 'always') {
			makeThenMaybe = true
		}
	}

	let otherwise: DataflowInformation | undefined
	let makeOtherwiseMaybe = false
	if(otherwiseArg !== undefined && conditionIsTrue !== 'always') {
		otherwise = processDataflowFor(otherwiseArg, data)
		if(otherwise.entryPoint) {
			otherwise.graph.addEdge(name.info.id, otherwise.entryPoint, { type: EdgeType.Returns })
		}
		if(conditionIsFalse !== 'always') {
			makeOtherwiseMaybe = true
		}
	}

	const nextGraph = cond.graph.mergeWith(then?.graph).mergeWith(otherwise?.graph)
	const thenEnvironment = then?.environment ?? cond.environment

	// if there is no "else" case, we have to recover whatever we had before as it may be not executed
	const finalEnvironment = appendEnvironment(thenEnvironment, otherwise ? otherwise.environment : cond.environment)

	const cdTrue = { id: rootId, when: true }
	const cdFalse = { id: rootId, when: false }
	// again within an if-then-else we consider all actives to be read
	const ingoing: IdentifierReference[] = [
		...cond.in,
		...(makeThenMaybe ? makeAllMaybe(then?.in, nextGraph, finalEnvironment, false, cdTrue) : then?.in ?? []),
		...(makeOtherwiseMaybe ? makeAllMaybe(otherwise?.in, nextGraph, finalEnvironment, false, cdFalse) : otherwise?.in ?? []),
		...cond.unknownReferences,
		...(makeThenMaybe ? makeAllMaybe(then?.unknownReferences, nextGraph, finalEnvironment, false, cdTrue) : then?.unknownReferences ?? []),
		...(makeOtherwiseMaybe ? makeAllMaybe(otherwise?.unknownReferences, nextGraph, finalEnvironment, false, cdFalse) : otherwise?.unknownReferences ?? []),
	]

	// we assign all with a maybe marker
	// we do not merge even if they appear in both branches because the maybe links will refer to different ids
	const outgoing = [
		...cond.out,
		...(makeThenMaybe ? makeAllMaybe(then?.out, nextGraph, finalEnvironment, true, cdTrue) : then?.out ?? []),
		...(makeOtherwiseMaybe ? makeAllMaybe(otherwise?.out, nextGraph, finalEnvironment, true, cdFalse) : otherwise?.out ?? []),
	]

	patchFunctionCall({
		nextGraph,
		rootId,
		name,
		data:                  { ...data, controlDependencies: originalDependency },
		argumentProcessResult: [cond, then, otherwise]
	})

	// as an if always evaluates its condition, we add a 'reads'-edge
	nextGraph.addEdge(name.info.id, cond.entryPoint, { type: EdgeType.Reads })

	const exitPoints = [
		...(then?.exitPoints ?? []).map(e => ({ ...e, controlDependencies: makeThenMaybe ? [...data.controlDependencies ?? [], { id: rootId, when: true }] : e.controlDependencies })),
		...(otherwise?.exitPoints ?? []).map(e => ({ ...e, controlDependencies: makeOtherwiseMaybe ? [...data.controlDependencies ?? [], { id: rootId, when: false }] : e.controlDependencies }))
	]

	return {
		unknownReferences: [],
		in:                [{ nodeId: rootId, name: name.content, controlDependencies: originalDependency }, ...ingoing],
		out:               outgoing,
		exitPoints,
		entryPoint:        rootId,
		environment:       finalEnvironment,
		graph:             nextGraph
	}
}
