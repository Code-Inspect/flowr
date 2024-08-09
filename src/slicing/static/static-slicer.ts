import { guard } from '../../util/assert'
import { expensiveTrace, log } from '../../util/log'
import type { SliceResult } from './slicer-types'
import { envFingerprint } from './fingerprint'
import { VisitingQueue } from './visiting-queue'
import { handleReturns, sliceForCall } from './slice-call'
import type { DataflowGraph } from '../../dataflow/graph/graph'
import type { NormalizedAst } from '../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { DecodedCriteria, SlicingCriteria } from '../criterion/parse'
import { convertAllSlicingCriteriaToIds } from '../criterion/parse'
import type { REnvironmentInformation } from '../../dataflow/environments/environment'
import { initializeCleanEnvironments } from '../../dataflow/environments/environment'
import type { NodeId } from '../../r-bridge/lang-4.x/ast/model/processing/node-id'
import { type DataflowGraphVertexInfo, VertexType } from '../../dataflow/graph/vertex'
import type { DataflowGraphEdge } from '../../dataflow/graph/edge'
import { edgeIncludesType, EdgeType, shouldTraverseEdge, TraverseEdge } from '../../dataflow/graph/edge'

export const slicerLogger = log.getSubLogger({ name: 'slicer' })

export function staticForwardSlicing(graph: DataflowGraph, ast: NormalizedAst, criteria: SlicingCriteria, threshold = 75): Readonly<SliceResult> {
	const decodedCriteria = convertAllSlicingCriteriaToIds(criteria, ast)
	expensiveTrace(slicerLogger, () => `calculating forward slice for ${decodedCriteria.length} seed criteria: ${decodedCriteria.map(s => JSON.stringify(s)).join(', ')}`)

	const queue = new VisitingQueue(threshold)
	const { minDepth, nodesToSlice } = addCriteriaToQueue(decodedCriteria, ast, queue)

	while(queue.nonEmpty()) {
		const current = queue.next()
		const { baseEnvironment, id, onlyForSideEffects } = current
		const baseEnvFingerprint = envFingerprint(baseEnvironment)

		const currentVertex = graph.getVertex(id, true)
		if(currentVertex === undefined) {
			slicerLogger.warn(`id: ${id} must be in graph but can not be found, keep in slice to be sure`)
			continue
		}
		const ingoingEdges = graph.ingoingEdges(id) ?? new Map<NodeId, DataflowGraphEdge>()

		addControlDependencies(currentVertex, nodesToSlice, minDepth, graph, ast, queue, baseEnvironment, baseEnvFingerprint)

		if(!onlyForSideEffects) {
			if(currentVertex.tag === VertexType.FunctionCall && !currentVertex.onlyBuiltin) {
				sliceForCall(current, currentVertex, graph, queue, nodesToSlice, true)
			}
		}

		traverseEdges(currentVertex, ingoingEdges, queue, baseEnvironment, baseEnvFingerprint, true)
	}

	return { ...queue.status(), decodedCriteria }
}

/**
 * This returns the ids to include in the slice, when slicing with the given seed id's (must be at least one).
 * <p>
 * The returned ids can be used to {@link reconstructToCode|reconstruct the slice to R code}.
 */
export function staticSlicing(graph: DataflowGraph, ast: NormalizedAst, criteria: SlicingCriteria, threshold = 75): Readonly<SliceResult> {
	guard(criteria.length > 0, 'must have at least one seed id to calculate slice')
	const decodedCriteria = convertAllSlicingCriteriaToIds(criteria, ast)
	expensiveTrace(slicerLogger, () => `calculating slice for ${decodedCriteria.length} seed criteria: ${decodedCriteria.map(s => JSON.stringify(s)).join(', ')}`)

	const queue = new VisitingQueue(threshold)
	const { minDepth, nodesToSlice } = addCriteriaToQueue(decodedCriteria, ast, queue)

	while(queue.nonEmpty()) {
		const current = queue.next()
		const { baseEnvironment, id, onlyForSideEffects } = current
		const baseEnvFingerprint = envFingerprint(baseEnvironment)

		const currentInfo = graph.get(id, true)
		if(currentInfo === undefined) {
			slicerLogger.warn(`id: ${id} must be in graph but can not be found, keep in slice to be sure`)
			continue
		}

		const [currentVertex, currentEdges] = currentInfo

		addControlDependencies(currentVertex, nodesToSlice, minDepth, graph, ast, queue, baseEnvironment, baseEnvFingerprint)

		if(!onlyForSideEffects) {
			if(currentVertex.tag === VertexType.FunctionCall && !currentVertex.onlyBuiltin) {
				sliceForCall(current, currentVertex, graph, queue, nodesToSlice)
			}

			const ret = handleReturns(queue, currentEdges, baseEnvFingerprint, baseEnvironment)
			if(ret) {
				continue
			}
		}

		traverseEdges(currentVertex, currentEdges, queue, baseEnvironment, baseEnvFingerprint)
	}

	return { ...queue.status(), decodedCriteria }
}

function addCriteriaToQueue(decodedCriteria: DecodedCriteria, ast: NormalizedAst, queue: VisitingQueue): {nodesToSlice: Set<NodeId>, minDepth: number} {
	let minDepth = Number.MAX_SAFE_INTEGER
	const nodesToSlice = new Set<NodeId>()

	// every node ships the call environment which registers the calling environment
	const emptyEnv = initializeCleanEnvironments()
	const basePrint = envFingerprint(emptyEnv)
	for(const startId of decodedCriteria) {
		queue.add(startId.id, emptyEnv, basePrint, false)
		// retrieve the minimum depth of all involved nodes to only add control dependencies if they are "part" of the current execution
		minDepth = Math.min(minDepth, ast.idMap.get(startId.id)?.info.depth ?? minDepth)
		nodesToSlice.add(startId.id)
	}

	return { nodesToSlice, minDepth }
}

function traverseEdges(currentVertex: DataflowGraphVertexInfo, currentEdges: Map<NodeId, DataflowGraphEdge>, queue: VisitingQueue, baseEnvironment: REnvironmentInformation, baseEnvFingerprint: string, forward = false) {
	for(const [target, { types }] of currentEdges) {
		if(edgeIncludesType(types, EdgeType.NonStandardEvaluation)) {
			continue
		}
		const t = shouldTraverseEdge(types)
		if(t === TraverseEdge.Always) {
			queue.add(target, baseEnvironment, baseEnvFingerprint, false)
		} else if(t === TraverseEdge.DefinedByOnCall) {
			const node = queue.potentialArguments.get(target)
			if(node) {
				queue.add(target, node.baseEnvironment, envFingerprint(node.baseEnvironment), node.onlyForSideEffects)
				queue.potentialArguments.delete(target)
			}
		} else if(t === TraverseEdge.SideEffect) {
			queue.add(target, baseEnvironment, baseEnvFingerprint, true)
		}
	}
}

function addControlDependencies(currentVertex: DataflowGraphVertexInfo, nodesToSlice: Set<NodeId>, minDepth: number, graph: DataflowGraph, ast: NormalizedAst, queue: VisitingQueue, baseEnvironment: REnvironmentInformation, baseEnvFingerprint: string) {
	// we only add control dependencies iff 1) we are in different function call or 2) they have, at least, the same depth as the slicing seed
	if(currentVertex.controlDependencies && currentVertex.controlDependencies.length > 0) {
		const topLevel = graph.isRoot(currentVertex.id) || nodesToSlice.has(currentVertex.id)
		for(const cd of currentVertex.controlDependencies.filter(({ id }) => !queue.hasId(id))) {
			if(!topLevel || (ast.idMap.get(cd.id)?.info.depth ?? 0) <= minDepth) {
				queue.add(cd.id, baseEnvironment, baseEnvFingerprint, false)
			}
		}
	}
}
