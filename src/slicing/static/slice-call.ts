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
import { pushLocalEnvironment } from '../../dataflow/environments/scoping'
import { overwriteEnvironment } from '../../dataflow/environments/overwrite'
import type { DataflowGraph, OutgoingEdges } from '../../dataflow/graph/graph'
import { BuiltIn } from '../../dataflow/environments/built-in'
import { resolveByName } from '../../dataflow/environments/resolve-by-name'
import { edgeIncludesType, EdgeType } from '../../dataflow/graph/edge'

function retrieveActiveEnvironment(callerInfo: DataflowGraphVertexFunctionCall, baseEnvironment: REnvironmentInformation): REnvironmentInformation {
	let callerEnvironment = callerInfo.environment

	if(baseEnvironment.level !== callerEnvironment.level) {
		while(baseEnvironment.level < callerEnvironment.level) {
			baseEnvironment = pushLocalEnvironment(baseEnvironment)
		}
		while(baseEnvironment.level > callerEnvironment.level) {
			callerEnvironment = pushLocalEnvironment(callerEnvironment)
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

	const functionCallDefs = resolveByName(callerInfo.name, activeEnvironment)?.filter(d => d.definedAt !== BuiltIn)?.map(d => d.nodeId) ?? []

	for(const [target, outgoingEdge] of outgoingEdges[1].entries()) {
		if(edgeIncludesType(outgoingEdge.types, EdgeType.Calls)) {
			functionCallDefs.push(target)
		}
	}

	const functionCallTargets = getAllLinkedFunctionDefinitions(new Set(functionCallDefs), dataflowGraph)

	const callStack = [...current.callStack ?? [], callerInfo.id]

	for(const [, functionCallTarget] of functionCallTargets) {
		// all those linked within the scopes of other functions are already linked when exiting a function definition
		for(const openIn of (functionCallTarget as DataflowGraphVertexFunctionDefinition).subflow.in) {
			const defs = openIn.name ? resolveByName(openIn.name, activeEnvironment) : undefined
			if(defs === undefined) {
				continue
			}
			for(const def of defs.filter(d => d.nodeId !== BuiltIn)) {
				queue.add({
					id:                 def.nodeId,
					baseEnvironment,
					onlyForSideEffects: current.onlyForSideEffects,
					callStack
				}, baseEnvPrint)
			}
		}

		for(const exitPoint of (functionCallTarget as DataflowGraphVertexFunctionDefinition).exitPoints) {
			queue.add({
				id:                 exitPoint,
				baseEnvironment:    activeEnvironment,
				onlyForSideEffects: current.onlyForSideEffects,
				callStack
			}, activeEnvironmentFingerprint)
		}
	}
}

/** Returns true if we found at least one return edge, applies all of them to the queue */
export function handleReturns(current: NodeToSlice, queue: VisitingQueue, currentEdges: OutgoingEdges, baseEnvFingerprint: Fingerprint, baseEnvironment: REnvironmentInformation): boolean {
	let found = false
	for(const [, edge] of currentEdges) {
		if(edgeIncludesType(edge.types, EdgeType.Returns)) {
			found = true
			break
		}
	}
	if(!found) {
		return false
	}
	for(const [target, edge] of currentEdges) {
		if(edgeIncludesType(edge.types, EdgeType.Returns | EdgeType.Reads)) {
			queue.add({
				id:                 target,
				baseEnvironment,
				onlyForSideEffects: false,
				callStack:          current.callStack
			}, baseEnvFingerprint)
		} else if(edgeIncludesType(edge.types, EdgeType.Argument)) {
			queue.potentialArguments.add(target)
		}
	}
	return true
}
