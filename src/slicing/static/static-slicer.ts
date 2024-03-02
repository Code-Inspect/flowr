import type {
	DataflowGraph,
	DataflowGraphVertexFunctionDefinition,
	DataflowGraphVertexInfo,
	REnvironmentInformation
} from '../../dataflow'
import {
	EdgeType,
	graphToMermaidUrl,
	initializeCleanEnvironments
} from '../../dataflow'
import { guard } from '../../util/assert'
import type {
	DecoratedAstMap,
	NodeId,
	NormalizedAst,
	RNodeWithParent } from '../../r-bridge'
import {
	collectAllIds,
	RType
} from '../../r-bridge'
import { expensiveTrace, log } from '../../util/log'
import objectHash from 'object-hash'
import type { DecodedCriteria, SlicingCriteria } from '../criterion'
import { convertAllSlicingCriteriaToIds } from '../criterion'
import { overwriteEnvironments, pushLocalEnvironment, resolveByName } from '../../dataflow/environments'
import { getAllLinkedFunctionDefinitions } from '../../dataflow/internal/linker'

export const slicerLogger = log.getSubLogger({ name: 'slicer' })


/**
 * Represents a node during the slicing process, together with the environment it is traversed in
 * (modified by function calls) and whether it is only used for its side effects.
 */
interface NodeToSlice {
	id:                 NodeId
	/** used for calling context etc. */
	baseEnvironment:    REnvironmentInformation
	/** if we add a function call we may need it only for its side effects (e.g., a redefinition of a global variable), if so, 'returns' links will not be traced */
	onlyForSideEffects: boolean
}



type Fingerprint = string

function envFingerprint(env: REnvironmentInformation): string {
	return objectHash(env, { excludeKeys: key => key === 'id' })
}

function fingerprint(id: NodeId, envFingerprint: string, onlyForSideEffects: boolean): Fingerprint {
	return `${id}-${envFingerprint}-${onlyForSideEffects ? '0' : '1'}`
}


/**
 * The result of the slice step
 */
export interface SliceResult {
	/**
	 * Number of times the set threshold was hit (i.e., the same node was visited too often).
	 * While any number above 0 might indicate a wrong slice, it does not have to as usually even revisiting the same node does not
	 * often cause more ids to be included in the slice.
	 */
	timesHitThreshold: number
	/**
	 * The ids of the nodes in the normalized ast that are part of the slice.
	 */
	result:            Set<NodeId>
	/**
	 * The mapping produced to decode the entered criteria
	 */
	decodedCriteria:   DecodedCriteria
}

class VisitingQueue {
	private readonly threshold: number
	private timesHitThreshold                 = 0
	private seen                              = new Map<Fingerprint, NodeId>()
	private idThreshold                       = new Map<NodeId, number>()
	private queue:              NodeToSlice[] = []

	constructor(threshold: number) {
		this.threshold = threshold
	}

	public add(target: NodeId, env: REnvironmentInformation, envFingerprint: string, onlyForSideEffects: boolean): void {
		const idCounter = this.idThreshold.get(target) ?? 0

		if(idCounter > this.threshold) {
			slicerLogger.warn(`id: ${target} has been visited ${idCounter} times, skipping`)
			this.timesHitThreshold++
			return
		} else {
			this.idThreshold.set(target, idCounter + 1)
		}

		const print = fingerprint(target, envFingerprint, onlyForSideEffects)

		if(!this.seen.has(print)) {
			this.seen.set(print, target)
			this.queue.push({ id: target, baseEnvironment: env, onlyForSideEffects: onlyForSideEffects })
		}
	}

	public next(): NodeToSlice {
		return this.queue.pop() as NodeToSlice
	}

	public nonEmpty(): boolean {
		return this.queue.length > 0
	}

	public status(): Readonly<Pick<SliceResult, 'timesHitThreshold' | 'result'>> {
		return {
			timesHitThreshold: this.timesHitThreshold,
			result:            new Set(this.seen.values())
		}
	}
}


/**
 * This returns the ids to include in the slice, when slicing with the given seed id's (must be at least one).
 * <p>
 * The returned ids can be used to {@link reconstructToCode|reconstruct the slice to R code}.
 */
export function staticSlicing(dataflowGraph: DataflowGraph, ast: NormalizedAst, criteria: SlicingCriteria, threshold = 75): Readonly<SliceResult> {
	guard(criteria.length > 0, 'must have at least one seed id to calculate slice')
	const decodedCriteria = convertAllSlicingCriteriaToIds(criteria, ast)
	const idMap = ast.idMap
	expensiveTrace(slicerLogger, () =>`calculating slice for ${decodedCriteria.length} seed criteria: ${decodedCriteria.map(s => JSON.stringify(s)).join(', ')}`)
	const queue = new VisitingQueue(threshold)

	// every node ships the call environment which registers the calling environment
	{
		const emptyEnv = initializeCleanEnvironments()
		const basePrint = envFingerprint(emptyEnv)
		for(const startId of decodedCriteria) {
			queue.add(startId.id, emptyEnv, basePrint, false)
		}
	}


	while(queue.nonEmpty()) {
		const current = queue.next()

		const baseEnvironment = current.baseEnvironment
		const baseEnvFingerprint = envFingerprint(baseEnvironment)

		const currentInfo = dataflowGraph.get(current.id, true)

		if(currentInfo === undefined) {
			slicerLogger.warn(`id: ${current.id} must be in graph but can not be found, keep in slice to be sure`)
			continue
		}

		const [currentVertex, currentEdges] = currentInfo

		if(currentVertex.tag === 'function-call' && !current.onlyForSideEffects) {
			slicerLogger.trace(`${current.id} is a function call`)
			sliceForCall(current, currentVertex, dataflowGraph, queue)
		}

		const currentNode = idMap.get(current.id)
		guard(currentNode !== undefined, () => `id: ${current.id} must be in dataflowIdMap is not in ${graphToMermaidUrl(dataflowGraph, idMap)}`)

		for(const [target, edge] of currentEdges) {
			if(edge.types.has(EdgeType.SideEffectOnCall)) {
				queue.add(target, baseEnvironment, baseEnvFingerprint, true)
			}
			if(edge.types.has(EdgeType.Reads) || edge.types.has(EdgeType.DefinedBy) || edge.types.has(EdgeType.Argument) || edge.types.has(EdgeType.Calls) || edge.types.has(EdgeType.Relates) || edge.types.has(EdgeType.DefinesOnCall)) {
				queue.add(target, baseEnvironment, baseEnvFingerprint, false)
			}
		}
		for(const controlFlowDependency of addControlDependencies(currentVertex.id, idMap)) {
			queue.add(controlFlowDependency, baseEnvironment, baseEnvFingerprint, false)
		}
	}

	// slicerLogger.trace(`static slicing produced: ${JSON.stringify([...seen])}`)
	return { ...queue.status(), decodedCriteria }
}


function addAllFrom(current: RNodeWithParent, collected: Set<NodeId>) {
	for(const id of collectAllIds(current)) {
		collected.add(id)
	}
}

function addControlDependencies(source: NodeId, ast: DecoratedAstMap): Set<NodeId> {
	const start = ast.get(source)

	const collected = new Set<NodeId>()

	let current = start
	while(current !== undefined) {
		if(current.type === RType.IfThenElse) {
			addAllFrom(current.condition, collected)
		} else if(current.type === RType.WhileLoop) {
			addAllFrom(current.condition, collected)
		} else if(current.type === RType.ForLoop) {
			addAllFrom(current.variable, collected)
			// vector not needed, if required, it is  linked by defined-by
		}
		// nothing to do for repeat and rest!
		current = current.info.parent ? ast.get(current.info.parent) : undefined
	}
	return collected
}

function retrieveActiveEnvironment(callerInfo: DataflowGraphVertexInfo, baseEnvironment: REnvironmentInformation) {
	let callerEnvironment = callerInfo.environment

	if(baseEnvironment.level !== callerEnvironment.level) {
		while(baseEnvironment.level < callerEnvironment.level) {
			baseEnvironment = pushLocalEnvironment(baseEnvironment)
		}
		while(baseEnvironment.level > callerEnvironment.level) {
			callerEnvironment = pushLocalEnvironment(callerEnvironment)
		}
	}

	return overwriteEnvironments(baseEnvironment, callerEnvironment)
}

//// returns the new threshold hit count
function sliceForCall(current: NodeToSlice, callerInfo: DataflowGraphVertexInfo, dataflowGraph: DataflowGraph, queue: VisitingQueue): void {
	// bind with call-local environments during slicing
	const outgoingEdges = dataflowGraph.get(callerInfo.id, true)
	guard(outgoingEdges !== undefined, () => `outgoing edges of id: ${callerInfo.id} must be in graph but can not be found, keep in slice to be sure`)

	// lift baseEnv on the same level
	const baseEnvironment = current.baseEnvironment
	const baseEnvPrint = envFingerprint(baseEnvironment)
	const activeEnvironment = retrieveActiveEnvironment(callerInfo, baseEnvironment)
	const activeEnvironmentFingerprint = envFingerprint(activeEnvironment)

	const functionCallDefs = resolveByName(callerInfo.name, activeEnvironment)?.map(d => d.nodeId) ?? []

	for(const [target, outgoingEdge] of outgoingEdges[1].entries()) {
		if(outgoingEdge.types.has(EdgeType.Calls)) {
			functionCallDefs.push(target)
		}
	}

	const functionCallTargets = getAllLinkedFunctionDefinitions(new Set(functionCallDefs), dataflowGraph)

	for(const [_, functionCallTarget] of functionCallTargets) {
		// all those linked within the scopes of other functions are already linked when exiting a function definition
		for(const openIn of (functionCallTarget as DataflowGraphVertexFunctionDefinition).subflow.in) {
			const defs = resolveByName(openIn.name, activeEnvironment)
			if(defs === undefined) {
				continue
			}
			for(const def of defs) {
				queue.add(def.nodeId, baseEnvironment, baseEnvPrint, current.onlyForSideEffects)
			}
		}

		for(const exitPoint of (functionCallTarget as DataflowGraphVertexFunctionDefinition).exitPoints) {
			queue.add(exitPoint, activeEnvironment, activeEnvironmentFingerprint, current.onlyForSideEffects)
		}
	}
}

