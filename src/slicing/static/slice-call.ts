import type { NodeToSlice } from './slicer-types'
import type { VisitingQueue } from './visiting-queue'
import { guard } from '../../util/assert'
import type { Fingerprint } from './fingerprint'
import { envFingerprint } from './fingerprint'
import { getAllLinkedFunctionDefinitions } from '../../dataflow/internal/linker'
import type {
	DataflowGraphVertexFunctionCall,
	DataflowGraphVertexFunctionDefinition
} from '../../dataflow/graph/vertex'
import type { REnvironmentInformation } from '../../dataflow/environments/environment'
import { initializeCleanEnvironments } from '../../dataflow/environments/environment'
import { pushLocalEnvironment } from '../../dataflow/environments/scoping'
import { overwriteEnvironment } from '../../dataflow/environments/overwrite'
import type { DataflowGraph, OutgoingEdges } from '../../dataflow/graph/graph'
import { BuiltIn } from '../../dataflow/environments/built-in'
import { resolveByName } from '../../dataflow/environments/resolve-by-name'
import { edgeIncludesType, EdgeType } from '../../dataflow/graph/edge'

function retrieveActiveEnvironment(callerInfo: DataflowGraphVertexFunctionCall, baseEnvironment: REnvironmentInformation): REnvironmentInformation {
	let callerEnvironment = callerInfo.environment

	const level = callerEnvironment?.level ?? 0

	if(baseEnvironment.level !== level) {
		while(baseEnvironment.level < level) {
			baseEnvironment = pushLocalEnvironment(baseEnvironment)
		}
		while(baseEnvironment.level > level) {
			callerEnvironment = pushLocalEnvironment(callerEnvironment ?? initializeCleanEnvironments(true))
		}
	}

	return overwriteEnvironment(baseEnvironment, callerEnvironment)
}

/** returns the new threshold hit count */
export function sliceForCall(current: NodeToSlice, callerInfo: DataflowGraphVertexFunctionCall, dataflowGraph: DataflowGraph, queue: VisitingQueue): void {
	// bind with call-local environments during slicing
	const outgoingEdges = dataflowGraph.get(callerInfo.id, true)
	guard(outgoingEdges !== undefined, () => `outgoing edges of id: ${callerInfo.id} must be in graph but can not be found, keep in slice to be sure`)

	// lift baseEnv on the same level
	const baseEnvironment = current.baseEnvironment
	const baseEnvPrint = envFingerprint(baseEnvironment)

	const activeEnvironment = retrieveActiveEnvironment(callerInfo, baseEnvironment)
	const activeEnvironmentFingerprint = envFingerprint(activeEnvironment)

	const name = callerInfo.name
	guard(name !== undefined, () => `name of id: ${callerInfo.id} can not be found in id map`)
	const functionCallDefs = resolveByName(name, activeEnvironment)?.filter(d => d.definedAt !== BuiltIn)?.map(d => d.nodeId) ?? []

	for(const [target, outgoingEdge] of outgoingEdges[1].entries()) {
		if(edgeIncludesType(outgoingEdge.types, EdgeType.Calls)) {
			functionCallDefs.push(target)
		}
	}

	const functionCallTargets = getAllLinkedFunctionDefinitions(new Set(functionCallDefs), dataflowGraph)

	for(const functionCallTarget of functionCallTargets) {
		// all those linked within the scopes of other functions are already linked when exiting a function definition
		for(const openIn of (functionCallTarget as DataflowGraphVertexFunctionDefinition).subflow.in) {
			const defs = openIn.name ? resolveByName(openIn.name, activeEnvironment) : undefined
			if(defs === undefined) {
				continue
			}
			for(const def of defs.filter(d => d.nodeId !== BuiltIn)) {
				queue.add(def.nodeId, baseEnvironment, baseEnvPrint, current.onlyForSideEffects)
			}
		}

		for(const exitPoint of (functionCallTarget as DataflowGraphVertexFunctionDefinition).exitPoints) {
			queue.add(exitPoint, activeEnvironment, activeEnvironmentFingerprint, current.onlyForSideEffects)
		}
	}
}

/** Returns true if we found at least one return edge */
export function handleReturns(queue: VisitingQueue, currentEdges: OutgoingEdges, baseEnvFingerprint: Fingerprint, baseEnvironment: REnvironmentInformation): boolean {
	const e = [...currentEdges.entries()]
	const found = e.filter(([_, edge]) => edgeIncludesType(edge.types, EdgeType.Returns))
	if(found.length === 0) {
		return false
	}
	for(const [target,] of found) {
		queue.add(target, baseEnvironment, baseEnvFingerprint, false)
	}
	for(const [target, edge] of e) {
		if(edgeIncludesType(edge.types, EdgeType.Reads)) {
			queue.add(target, baseEnvironment, baseEnvFingerprint, false)
		} else if(edgeIncludesType(edge.types, EdgeType.Argument)) {
			queue.potentialArguments.set(target, {
				id:                 target,
				baseEnvironment,
				onlyForSideEffects: false
			})
		}
	}
	return true
}
