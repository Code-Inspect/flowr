import { guard } from '../../util/assert'
import { expensiveTrace, log } from '../../util/log'
import type { SliceResult } from './slicer-types'
import { envFingerprint } from './fingerprint'
import { VisitingQueue } from './visiting-queue'
import { handleReturns, sliceForCall } from './slice-call'
import type { DataflowGraph } from '../../dataflow/graph/graph'
import type { NormalizedAst } from '../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { SlicingCriteria } from '../criterion/parse'
import { convertAllSlicingCriteriaToIds } from '../criterion/parse'
import { initializeCleanEnvironments } from '../../dataflow/environments/environment'
import type { NodeId } from '../../r-bridge/lang-4.x/ast/model/processing/node-id'
import { VertexType } from '../../dataflow/graph/vertex'
import { edgeIncludesType, EdgeType, shouldTraverseEdge, TraverseEdge } from '../../dataflow/graph/edge'
import { BuiltIn } from '../../dataflow/environments/built-in'

export const slicerLogger = log.getSubLogger({ name: 'slicer' })

/**
 * This returns the ids to include in the slice, when slicing with the given seed id's (must be at least one).
 * <p>
 * The returned ids can be used to {@link reconstructToCode|reconstruct the slice to R code}.
 */
export function staticSlicing(graph: DataflowGraph, ast: NormalizedAst, criteria: SlicingCriteria, threshold = 75): Readonly<SliceResult> {
	guard(criteria.length > 0, 'must have at least one seed id to calculate slice')
	const decodedCriteria = convertAllSlicingCriteriaToIds(criteria, ast)
	expensiveTrace(slicerLogger, () =>`calculating slice for ${decodedCriteria.length} seed criteria: ${decodedCriteria.map(s => JSON.stringify(s)).join(', ')}`)
	const queue = new VisitingQueue(threshold)

	let minDepth = Number.MAX_SAFE_INTEGER
	const sliceSeedIds = new Set<NodeId>()
	// every node ships the call environment which registers the calling environment
	{
		const emptyEnv = initializeCleanEnvironments()
		const basePrint = envFingerprint(emptyEnv)
		for(const startId of decodedCriteria) {
			queue.add({
				id:                 startId.id,
				callStack:          [],
				baseEnvironment:    emptyEnv,
				onlyForSideEffects: false
			}, basePrint)
			// retrieve the minimum depth of all nodes to only add control dependencies if they are "part" of the current execution
			minDepth = Math.min(minDepth, ast.idMap.get(startId.id)?.info.depth ?? minDepth)
			sliceSeedIds.add(startId.id)
		}
	}

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

		// we only add control dependencies iff 1) we are in different function call or 2) they have, at least, the same depth as the slicing seed
		if(currentVertex.controlDependencies) {
			const topLevel = graph.isRoot(id) || sliceSeedIds.has(id)
			for(const cd of currentVertex.controlDependencies) {
				if(!topLevel || (ast.idMap.get(cd.id)?.info.depth ?? 0) <= minDepth) {
					queue.add({
						id:                 cd.id,
						baseEnvironment,
						callStack:          [],
						onlyForSideEffects: false
					}, baseEnvFingerprint)
				}
			}
		}

		if(!onlyForSideEffects) {
			if(currentVertex.tag === VertexType.FunctionCall && !currentVertex.onlyBuiltin) {
				sliceForCall(current, currentVertex, graph, queue)
			}

			const ret = handleReturns(current, queue, currentEdges, baseEnvFingerprint, baseEnvironment)
			if(ret) {
				continue
			}
		}

		for(const [target, { types }] of currentEdges) {
			if(target === BuiltIn || edgeIncludesType(types, EdgeType.NonStandardEvaluation)) {
				continue
			}
			const t = shouldTraverseEdge(types)
			if(t === TraverseEdge.Always) {
				queue.add({
					id:                 target,
					baseEnvironment,
					callStack:          current.callStack,
					onlyForSideEffects: false
				}, baseEnvFingerprint)
			} else if(t === TraverseEdge.DefinedByOnCall && queue.potentialArguments.has(target)) {
				queue.add({
					id:                 target,
					baseEnvironment,
					callStack:          current.callStack,
					onlyForSideEffects: false
				}, baseEnvFingerprint)
				queue.potentialArguments.delete(target)
			} else if(t === TraverseEdge.SideEffect) {
				queue.add({
					id:                 target,
					baseEnvironment,
					callStack:          current.callStack,
					onlyForSideEffects: true
				}, baseEnvFingerprint)
			}
		}
	}

	return { ...queue.status(), decodedCriteria }
}
