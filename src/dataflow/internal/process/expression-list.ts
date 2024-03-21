/**
 * Processes a list of expressions joining their dataflow graphs accordingly.
 * @module
 */
import type { DataflowInformation } from '../info'
import { initializeCleanInfo } from '../info'
import type { NodeId, ParentInformation, RExpressionList } from '../../../r-bridge'
import { RType, visitAst } from '../../../r-bridge'
import type { DataflowProcessorInformation } from '../../processor'
import { processDataflowFor } from '../../processor'
import type {
	IdentifierReference, IEnvironment,
	REnvironmentInformation } from '../../environments'
import { makeAllMaybe,
	overwriteEnvironments, popLocalEnvironment,
	resolveByName
} from '../../environments'
import { linkFunctionCalls, linkReadVariablesInSameScopeWithNames } from '../linker'
import { DefaultMap } from '../../../util/defaultmap'
import type { DataflowGraphVertexInfo } from '../../graph'
import { DataflowGraph } from '../../graph'
import { dataflowLogger, EdgeType } from '../../index'
import { guard } from '../../../util/assert'


const dotDotDotAccess = /\.\.\d+/
function linkReadNameToWriteIfPossible<OtherInfo>(read: IdentifierReference, data: DataflowProcessorInformation<OtherInfo>, environments: REnvironmentInformation, listEnvironments: Set<NodeId>, remainingRead: Map<string, IdentifierReference[]>, nextGraph: DataflowGraph) {
	const readName = dotDotDotAccess.test(read.name) ? '...' : read.name

	const probableTarget = resolveByName(readName, data.activeScope, environments)

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
		nextGraph.addEdge(read, target, EdgeType.Reads, undefined, true)
	}
}


function processNextExpression<OtherInfo>(
	currentElement: DataflowInformation,
	data: DataflowProcessorInformation<OtherInfo>,
	environments: REnvironmentInformation,
	listEnvironments: Set<NodeId>,
	remainingRead: Map<string, IdentifierReference[]>,
	nextGraph: DataflowGraph
) {
	// all inputs that have not been written until know, are read!
	for(const read of [...currentElement.in, ...currentElement.unknownReferences]) {
		linkReadNameToWriteIfPossible(read, data, environments, listEnvironments, remainingRead, nextGraph)
	}
	// add same variable reads for deferred if they are read previously but not dependent
	for(const writeTarget of currentElement.out) {
		const writeName = writeTarget.name

		const resolved = resolveByName(writeName, data.activeScope, environments)
		if(resolved !== undefined) {
			// write-write
			for(const target of resolved) {
				nextGraph.addEdge(target, writeTarget, EdgeType.SameDefDef, undefined, true)
			}
		}
	}
}

function updateSideEffectsForCalledFunctions(calledEnvs: {
	functionCall: NodeId;
	called:       DataflowGraphVertexInfo[]
}[], environments: REnvironmentInformation, nextGraph: DataflowGraph) {
	for(const { functionCall, called } of calledEnvs) {
		for(const calledFn of called) {
			guard(calledFn.tag === 'function-definition', 'called function must call a function definition')
			// only merge the environments they have in common
			let environment = calledFn.environment
			while(environment.level > environments.level) {
				environment = popLocalEnvironment(environment)
			}
			// update alle definitions to be defined at this function call
			let current: IEnvironment | undefined = environment.current
			while(current !== undefined) {
				for(const definitions of current.memory.values()) {
					for(const def of definitions) {
						if(def.kind !== 'built-in-function') {
							nextGraph.addEdge(def.nodeId, functionCall, EdgeType.SideEffectOnCall, def.used)
						}
					}
				}
				current = current.parent
			}
			// we update all definitions to be linked with teh corresponding function call
			environments = overwriteEnvironments(environments, environment)
		}
	}
	return environments
}

export function processExpressionList<OtherInfo>(exprList: RExpressionList<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo & ParentInformation>): DataflowInformation {
	const expressions = exprList.children
	dataflowLogger.trace(`processing expression list with ${expressions.length} expressions`)
	if(expressions.length === 0) {
		return initializeCleanInfo(data)
	}

	let environments = data.environments
	// used to detect if a "write" happens within the same expression list
	const listEnvironments: Set<NodeId> = new Set<NodeId>()

	const remainingRead = new Map<string, IdentifierReference[]>()

	const nextGraph = new DataflowGraph()
	const out = []

	let expressionCounter = 0
	let foundNextOrBreak = false
	for(const expression of expressions) {
		dataflowLogger.trace(`processing expression ${++expressionCounter} of ${expressions.length}`)
		// use the current environments for processing
		data = { ...data, environments }
		const processed = processDataflowFor(expression, data)
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- seems to be a bug in eslint
		if(!foundNextOrBreak) {
			visitAst(expression, n => {
				if(n.type === RType.Next || n.type === RType.Break) {
					foundNextOrBreak = true
				}
				return n.type === RType.ForLoop || n.type === RType.WhileLoop || n.type === RType.RepeatLoop || n.type === RType.FunctionDefinition
			})
		}
		// if the expression contained next or break anywhere before the next loop, the overwrite should be an append because we do not know if the rest is executed
		// update the environments for the next iteration with the previous writes
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- seems to be a bug in eslint
		if(foundNextOrBreak) {
			processed.out = makeAllMaybe(processed.out, nextGraph, processed.environments)
			processed.in = makeAllMaybe(processed.in, nextGraph, processed.environments)
			processed.unknownReferences = makeAllMaybe(processed.unknownReferences, nextGraph, processed.environments)
		}

		nextGraph.mergeWith(processed.graph)
		out.push(...processed.out)

		dataflowLogger.trace(`expression ${expressionCounter} of ${expressions.length} has ${processed.unknownReferences.length} unknown nodes`)

		processNextExpression(processed, data, environments, listEnvironments, remainingRead, nextGraph)
		const functionCallIds = [...processed.graph.vertices(true)]
			.filter(([_,info]) => info.tag === 'function-call')

		const calledEnvs = linkFunctionCalls(nextGraph, data.completeAst.idMap, functionCallIds, processed.graph)

		environments = overwriteEnvironments(environments, processed.environments)

		// if the called function has global redefinitions, we have to keep them within our environment
		environments = updateSideEffectsForCalledFunctions(calledEnvs, environments, nextGraph)

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
		environments,
		scope:             data.activeScope,
		graph:             nextGraph
	}
}
