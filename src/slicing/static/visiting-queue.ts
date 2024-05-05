import type { Fingerprint } from './fingerprint'
import { fingerprint } from './fingerprint'
import type { NodeId } from '../../r-bridge'
import type { NodeToSlice, SliceResult } from './slicer-types'
import type { REnvironmentInformation } from '../../dataflow'
import { slicerLogger } from './static-slicer'

export class VisitingQueue {
	private readonly threshold: number
	private timesHitThreshold                 = 0
	private seen                              = new Map<Fingerprint, NodeId>()
	private idThreshold                       = new Map<NodeId, number>()
	private queue:              NodeToSlice[] = []
	// the set of potential arguments holds arguments which may be added if found with the `defined-by-on-call` edge
	public potentialArguments:  Set<NodeId> = new Set()

	constructor(threshold: number) {
		this.threshold = threshold
	}

	/**
	 * Adds a node to the queue if it has not been seen before.
	 * @param target             - the node to add
	 * @param env                - the environment the node is traversed in
	 * @param envFingerprint     - the fingerprint of the environment
	 * @param onlyForSideEffects - whether the node is only used for its side effects
	 */
	public add(target: NodeId, env: REnvironmentInformation, envFingerprint: string, onlyForSideEffects: boolean): void {
		const idCounter = this.idThreshold.get(target) ?? 0

		if(idCounter > this.threshold) {
			slicerLogger.warn(`id: ${target} has been visited ${idCounter} times, skipping`)
			this.timesHitThreshold++
			return
		} else {
			this.idThreshold.set(target, idCounter + 1)
		}

		/* we do not include the in call part in the fingerprint as it is 'deterministic' from the source position */
		const print = fingerprint(target, envFingerprint, onlyForSideEffects)

		if(!this.seen.has(print)) {
			this.seen.set(print, target)
			this.queue.push({ id: target, baseEnvironment: env, onlyForSideEffects })
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
