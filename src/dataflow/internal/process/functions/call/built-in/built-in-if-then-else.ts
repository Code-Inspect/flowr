import type { NodeId, ParentInformation, RFunctionArgument, RSymbol } from '../../../../../../r-bridge'
import { EmptyArgument } from '../../../../../../r-bridge'
import type { DataflowProcessorInformation } from '../../../../../processor'
import { processDataflowFor } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import { appendEnvironment, type IdentifierReference, makeAllMaybe, resolvesToBuiltInConstant } from '../../../../../environments'
import { dataflowLogger, EdgeType } from '../../../../../index'
import { processKnownFunctionCall } from '../known-call-handling'
import { linkIngoingVariablesInSameScope } from '../../../../linker'
import { patchFunctionCall } from '../common'

export function processIfThenElse<OtherInfo>(
	name:   RSymbol<OtherInfo & ParentInformation>,
	args:   readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data:   DataflowProcessorInformation<OtherInfo & ParentInformation>
): DataflowInformation {
	if(args.length !== 2 && args.length !== 3) {
		dataflowLogger.warn(`If-then-else ${name.content} has something different from 2 or 3 arguments, skipping`)
		return processKnownFunctionCall(name, args, rootId, data).information
	}

	const [condArg, thenArg, otherwiseArg] = args as [RFunctionArgument<OtherInfo & ParentInformation>, RFunctionArgument<OtherInfo & ParentInformation>, RFunctionArgument<OtherInfo & ParentInformation> | undefined]

	if(condArg === EmptyArgument || thenArg === EmptyArgument) {
		dataflowLogger.warn(`If-then-else ${name.content} has empty condition or then case in ${JSON.stringify(args)}, skipping`)
		return processKnownFunctionCall(name, args, rootId, data).information
	}

	const cond = processDataflowFor(condArg, data)

	const originalDependency = data.controlDependency
	data = { ...data,controlDependency: [...data.controlDependency ?? [], name.info.id], environment: cond.environment }

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
	if(otherwiseArg !== undefined && otherwiseArg !== EmptyArgument && conditionIsTrue !== 'always') {
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

	// if there is no "else" case we have to recover whatever we had before as it may be not executed
	const finalEnvironment = appendEnvironment(thenEnvironment, otherwise ? otherwise.environment : cond.environment)

	// again within an if-then-else we consider all actives to be read
	const ingoing: IdentifierReference[] = [
		...cond.in,
		...(makeThenMaybe ? makeAllMaybe(then?.in, nextGraph, finalEnvironment, false) : then?.in ?? []),
		...(makeOtherwiseMaybe ? makeAllMaybe(otherwise?.in, nextGraph, finalEnvironment, false) : otherwise?.in ?? []),
		...cond.unknownReferences,
		...(makeThenMaybe ? makeAllMaybe(then?.unknownReferences, nextGraph, finalEnvironment, false) : then?.unknownReferences ?? []),
		...(makeOtherwiseMaybe ? makeAllMaybe(otherwise?.unknownReferences, nextGraph, finalEnvironment, false) : otherwise?.unknownReferences ?? []),
	]

	// we assign all with a maybe marker
	// we do not merge even if they appear in both branches because the maybe links will refer to different ids
	const outgoing = [
		...cond.out,
		...(makeThenMaybe ? makeAllMaybe(then?.out, nextGraph, finalEnvironment, true) : then?.out ?? []),
		...(makeOtherwiseMaybe ? makeAllMaybe(otherwise?.out, nextGraph, finalEnvironment, true) : otherwise?.out ?? []),
	]
	linkIngoingVariablesInSameScope(nextGraph, ingoing)

	patchFunctionCall(nextGraph, rootId, name, { ...data, controlDependency: originalDependency }, [cond, then, otherwise])

	return {
		unknownReferences: [],
		in:                [{ nodeId: rootId, name: name.content, controlDependency: originalDependency }, ...ingoing],
		out:               outgoing,
		breaks:            [],
		returns:           [],
		nexts:             [],
		entryPoint:        name.info.id,
		environment:       finalEnvironment,
		graph:             nextGraph
	}
}
