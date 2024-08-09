/**
 * Processes a list of expressions joining their dataflow graphs accordingly.
 * @module
 */
import type { DataflowInformation, ExitPoint } from '../../../../../info'
import { addNonDefaultExitPoints, alwaysExits, ExitPointType } from '../../../../../info'
import type { DataflowProcessorInformation } from '../../../../../processor'
import { processDataflowFor } from '../../../../../processor'
import { linkFunctionCalls } from '../../../../linker'
import { guard, isNotUndefined } from '../../../../../../util/assert'
import { unpackArgument } from '../argument/unpack-argument'
import { patchFunctionCall } from '../common'
import type { IEnvironment, REnvironmentInformation } from '../../../../../environments/environment'
import { makeAllMaybe } from '../../../../../environments/environment'
import type { NodeId } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/node-id'
import { DataflowGraph } from '../../../../../graph/graph'
import type { IdentifierReference } from '../../../../../environments/identifier'
import { resolveByName } from '../../../../../environments/resolve-by-name'
import { EdgeType } from '../../../../../graph/edge'
import type { DataflowGraphVertexInfo } from '../../../../../graph/vertex'
import { popLocalEnvironment } from '../../../../../environments/scoping'
import { BuiltIn } from '../../../../../environments/built-in'
import { overwriteEnvironment } from '../../../../../environments/overwrite'
import type { ParentInformation } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RFunctionArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { RSymbol } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import { dataflowLogger } from '../../../../../logger'


const dotDotDotAccess = /\.\.\d+/
function linkReadNameToWriteIfPossible(read: IdentifierReference, environments: REnvironmentInformation, listEnvironments: Set<NodeId>, remainingRead: Map<string | undefined, IdentifierReference[]>, nextGraph: DataflowGraph) {
	const readName = read.name && dotDotDotAccess.test(read.name) ? '...' : read.name

	const probableTarget = readName ? resolveByName(readName, environments) : undefined

	// record if at least one has not been defined
	if(probableTarget === undefined || probableTarget.some(t => !listEnvironments.has(t.nodeId))) {
		if(remainingRead.has(readName)) {
			remainingRead.get(readName)?.push(read)
		} else {
			remainingRead.set(readName, [read])
		}
	}

	// keep it, for we have no target, as read-ids are unique within the same fold, this should work for same links
	// we keep them if they are defined outside the current parent and maybe throw them away later
	if(probableTarget === undefined) {
		return
	}

	for(const target of probableTarget) {
		// we can stick with maybe even if readId.attribute is always
		nextGraph.addEdge(read, target, { type: EdgeType.Reads })
	}
}


function processNextExpression(
	currentElement: DataflowInformation,
	environment: REnvironmentInformation,
	listEnvironments: Set<NodeId>,
	remainingRead: Map<string, IdentifierReference[]>,
	nextGraph: DataflowGraph
) {
	// all inputs that have not been written until now, are read!
	for(const read of [...currentElement.in, ...currentElement.unknownReferences]) {
		linkReadNameToWriteIfPossible(read, environment, listEnvironments, remainingRead, nextGraph)
	}
}

function updateSideEffectsForCalledFunctions(calledEnvs: {
	functionCall: NodeId;
	called:       readonly DataflowGraphVertexInfo[]
}[], inputEnvironment: REnvironmentInformation, nextGraph: DataflowGraph) {
	for(const { functionCall, called } of calledEnvs) {
		for(const calledFn of called) {
			guard(calledFn.tag === 'function-definition', 'called function must call a function definition')
			// only merge the environments they have in common
			let environment = calledFn.environment
			while(environment.level > inputEnvironment.level) {
				environment = popLocalEnvironment(environment)
			}
			// update alle definitions to be defined at this function call
			let current: IEnvironment | undefined = environment.current
			while(current !== undefined) {
				for(const definitions of current.memory.values()) {
					for(const def of definitions) {
						if(def.definedAt !== BuiltIn) {
							nextGraph.addEdge(def.nodeId, functionCall, { type: EdgeType.SideEffectOnCall })
						}
					}
				}
				current = current.parent
			}
			// we update all definitions to be linked with the corresponding function call
			inputEnvironment = overwriteEnvironment(inputEnvironment, environment)
		}
	}
	return inputEnvironment
}

export function processExpressionList<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>
): DataflowInformation {
	const expressions = args.map(unpackArgument)

	dataflowLogger.trace(`processing expression list with ${expressions.length} expressions`)

	let environment = data.environment
	// used to detect if a "write" happens within the same expression list
	const listEnvironments: Set<NodeId> = new Set<NodeId>()

	const remainingRead = new Map<string, IdentifierReference[]>()

	const nextGraph = new DataflowGraph(data.completeAst.idMap)
	const out = []
	const exitPoints: ExitPoint[] = []

	let expressionCounter = 0
	const processedExpressions: (DataflowInformation | undefined)[] = []
	let defaultReturnExpr: undefined | DataflowInformation = undefined

	for(const expression of expressions) {
		dataflowLogger.trace(`processing expression ${++expressionCounter} of ${expressions.length}`)
		if(expression === undefined) {
			processedExpressions.push(undefined)
			continue
		}
		// use the current environments for processing
		data = { ...data, environment: environment }
		const processed = processDataflowFor(expression, data)
		processedExpressions.push(processed)
		nextGraph.mergeWith(processed.graph)
		defaultReturnExpr = processed

		// if the expression contained next or break anywhere before the next loop, the overwrite should be an append because we do not know if the rest is executed
		// update the environments for the next iteration with the previous writes
		if(exitPoints.length > 0) {
			processed.out = makeAllMaybe(processed.out, nextGraph, processed.environment, true)
			processed.in = makeAllMaybe(processed.in, nextGraph, processed.environment, false)
			processed.unknownReferences = makeAllMaybe(processed.unknownReferences, nextGraph, processed.environment, false)
		}

		addNonDefaultExitPoints(exitPoints, processed.exitPoints)

		out.push(...processed.out)

		dataflowLogger.trace(`expression ${expressionCounter} of ${expressions.length} has ${processed.unknownReferences.length} unknown nodes`)

		processNextExpression(processed, environment, listEnvironments, remainingRead, nextGraph)

		const calledEnvs = linkFunctionCalls(nextGraph, data.completeAst.idMap, processed.graph)

		environment = exitPoints.length > 0 ? overwriteEnvironment(environment, processed.environment) : processed.environment
		// if the called function has global redefinitions, we have to keep them within our environment
		environment = updateSideEffectsForCalledFunctions(calledEnvs, environment, nextGraph)

		for(const { nodeId } of processed.out) {
			listEnvironments.add(nodeId)
		}

		/** if at least built-one of the exit points encountered happens unconditionally, we exit here (dead code)! */
		if(alwaysExits(processed)) {
			/* if there is an always-exit expression, there is no default return active anymore */
			defaultReturnExpr = undefined
			break
		}
	}

	dataflowLogger.trace(`expression list exits with ${remainingRead.size} remaining read names`)

	if(defaultReturnExpr) {
		exitPoints.push({
			type:                ExitPointType.Default,
			nodeId:              defaultReturnExpr.entryPoint,
			controlDependencies: data.controlDependencies
		})
	}

	const ingoing = [...remainingRead.values()].flat()

	const rootNode = data.completeAst.idMap.get(rootId)
	const withGroup = rootNode?.grouping

	if(withGroup) {
		ingoing.push({ nodeId: rootId, name: name.content, controlDependencies: data.controlDependencies })
		patchFunctionCall({
			nextGraph,
			rootId,
			name,
			data,
			argumentProcessResult: processedExpressions
		})
		// process all exit points as potential returns:
		for(const exit of exitPoints) {
			if(exit.type === ExitPointType.Return || exit.type === ExitPointType.Default) {
				nextGraph.addEdge(rootId, exit.nodeId, { type: EdgeType.Returns })
			}
		}
	}

	const meId = withGroup ? rootId : (processedExpressions.find(isNotUndefined)?.entryPoint ?? rootId)
	return {
		/* no active nodes remain, they are consumed within the remaining read collection */
		unknownReferences: [],
		in:                ingoing,
		out,
		environment:       environment,
		graph:             nextGraph,
		/* if we have no group we take the last evaluated expr */
		entryPoint:        meId,
		exitPoints:        withGroup ? [{ nodeId: rootId, type: ExitPointType.Default, controlDependencies: data.controlDependencies }]
			: exitPoints
	}
}
