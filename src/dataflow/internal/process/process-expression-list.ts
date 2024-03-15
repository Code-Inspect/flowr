/**
 * Processes a list of expressions joining their dataflow graphs accordingly.
 * @module
 */
import { initializeCleanDataflowInformation, type DataflowInformation } from '../../info'
import type { NodeId, ParentInformation, RExpressionList } from '../../../r-bridge'
import { RType } from '../../../r-bridge'
import type { DataflowProcessorInformation } from '../../processor'
import { processDataflowFor } from '../../processor'
import type {
	IdentifierReference, IEnvironment,
	REnvironmentInformation } from '../../environments'
import { makeAllMaybe,
	overwriteEnvironment, popLocalEnvironment,
	resolveByName
} from '../../environments'
import { linkFunctionCalls, linkReadVariablesInSameScopeWithNames } from '../linker'
import { DefaultMap } from '../../../util/defaultmap'
import type { DataflowGraphVertexInfo } from '../../graph'
import { CONSTANT_NAME , DataflowGraph } from '../../graph'
import { dataflowLogger, EdgeType } from '../../index'
import { guard } from '../../../util/assert'
import { processAsNamedCall } from './process-named-call'


const dotDotDotAccess = /\.\.\d+/
function linkReadNameToWriteIfPossible(read: IdentifierReference, environments: REnvironmentInformation, listEnvironments: Set<NodeId>, remainingRead: Map<string, IdentifierReference[]>, nextGraph: DataflowGraph) {
	const readName = read.name && dotDotDotAccess.test(read.name) ? '...' : read.name ?? CONSTANT_NAME

	const probableTarget = resolveByName(readName, environments)

	// record if at least one has not been defined
	if(probableTarget === undefined || probableTarget.some(t => !listEnvironments.has(t.nodeId))) {
		if(remainingRead.has(readName)) {
			remainingRead.get(readName)?.push(read)
		} else {
			remainingRead.set(readName, [read])
		}
	}

	// keep it, for we have no target, as read-ids are unique within same fold, this should work for same links
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
	// all inputs that have not been written until know, are read!
	for(const read of [...currentElement.in, ...currentElement.unknownReferences]) {
		linkReadNameToWriteIfPossible(read, environment, listEnvironments, remainingRead, nextGraph)
	}
	// add same variable reads for deferred if they are read previously but not dependent
	for(const writeTarget of currentElement.out) {
		const writeName = writeTarget.name

		const resolved = writeName ? resolveByName(writeName, environment) : undefined
		if(resolved !== undefined) {
			// write-write
			for(const target of resolved) {
				nextGraph.addEdge(target, writeTarget, { type: EdgeType.SameDefDef })
			}
		}
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
						if(def.kind !== 'built-in-function') {
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

export function processExpressionList<OtherInfo>(exprList: RExpressionList<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo & ParentInformation>): DataflowInformation {
	const expressions = exprList.children

	if(exprList.grouping !== undefined) {
		const start = exprList.grouping[0]
		return processAsNamedCall({
			type:      RType.Symbol,
			info:      exprList.info,
			content:   start.lexeme,
			lexeme:    start.lexeme,
			location:  start.location,
			namespace: undefined
		}, data, start.lexeme, expressions)
	}

	dataflowLogger.trace(`processing expression list with ${expressions.length} expressions`)
	if(expressions.length === 0) {
		return initializeCleanDataflowInformation(data)
	}

	let environment = data.environment
	// used to detect if a "write" happens within the same expression list
	const listEnvironments: Set<NodeId> = new Set<NodeId>()

	const remainingRead = new Map<string, IdentifierReference[]>()

	const nextGraph = new DataflowGraph()
	const out = []

	let nexts: NodeId[] = []
	let breaks: NodeId[] = []
	let returns: NodeId[] = []

	let expressionCounter = 0
	const foundNextOrBreak = false
	for(const expression of expressions) {
		dataflowLogger.trace(`processing expression ${++expressionCounter} of ${expressions.length}`)
		// use the current environments for processing
		data = { ...data, environment: environment }
		const processed = processDataflowFor(expression, data)

		breaks = [...breaks, ...processed.breaks]
		returns = [...returns, ...processed.returns]
		nexts = [...nexts, ...processed.nexts]

		// if the expression contained next or break anywhere before the next loop, the overwrite should be an append because we do not know if the rest is executed
		// update the environments for the next iteration with the previous writes
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- seems to be a bug in eslint
		if(breaks.length > 0 || returns.length > 0 || nexts.length > 0) {
			processed.out = makeAllMaybe(processed.out, nextGraph, processed.environment, true)
			processed.in = makeAllMaybe(processed.in, nextGraph, processed.environment, false)
			processed.unknownReferences = makeAllMaybe(processed.unknownReferences, nextGraph, processed.environment, false)
		}

		nextGraph.mergeWith(processed.graph)
		out.push(...processed.out)

		dataflowLogger.trace(`expression ${expressionCounter} of ${expressions.length} has ${processed.unknownReferences.length} unknown nodes`)

		processNextExpression(processed, environment, listEnvironments, remainingRead, nextGraph)
		const functionCallIds = [...processed.graph.vertices(true)]
			.filter(([_,info]) => info.tag === 'function-call')

		const calledEnvs = linkFunctionCalls(nextGraph, data.completeAst.idMap, functionCallIds, processed.graph)

		if(foundNextOrBreak) {
			environment = overwriteEnvironment(environment, processed.environment)
		} else {
			environment = processed.environment
		}

		// if the called function has global redefinitions, we have to keep them within our environment
		environment = updateSideEffectsForCalledFunctions(calledEnvs, environment, nextGraph)

		for(const { nodeId } of processed.out) {
			listEnvironments.add(nodeId)
		}
	}


	// now, we have to link same reads
	linkReadVariablesInSameScopeWithNames(nextGraph, new DefaultMap(() => [], remainingRead))

	dataflowLogger.trace(`expression list exits with ${remainingRead.size} remaining read names`)

	return {
		/* no active nodes remain, they are consumed within the remaining read collection */
		unknownReferences: [],
		in:                [...remainingRead.values()].flat(),
		out,
		environment:       environment,
		graph:             nextGraph,
		entryPoint:        exprList.info.id,
		returns:           returns,
		breaks:            breaks,
		nexts:             nexts
	}
}
