import type { Fingerprint } from './fingerprint'
import { fingerprint } from './fingerprint'
import type { NodeToSlice, SliceResult } from './slicer-types'
import { slicerLogger } from './static-slicer'
import type { NodeId } from '../../r-bridge/lang-4.x/ast/model/processing/node-id'

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
	 * @param node           - the {@link NodeToSlice|node} to add
	 * @param envFingerprint - The environment fingerprint is passed separately to encourage external caching.
	 */
	public add(node: NodeToSlice, envFingerprint: string): void {
		const { id, onlyForSideEffects } = node
		const idCounter = this.idThreshold.get(id) ?? 0
		if(idCounter > this.threshold) {
			slicerLogger.warn(`id: ${id} has been visited ${idCounter} times, skipping`)
			this.timesHitThreshold++
			return
		}

		/* we do not include the in call part in the fingerprint as it is 'deterministic' from the source position */
		const print = fingerprint(id, envFingerprint, onlyForSideEffects)

		if(!this.seen.has(print)) {
			this.idThreshold.set(id, idCounter + 1)
			this.seen.set(print, id)
			this.queue.push(node)
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
