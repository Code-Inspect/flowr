import type { AINodeStore } from '../ainode'
import { aiLogger } from '../processor'
import type { DataflowInformation } from '../../dataflow/info'

export abstract class Handler {
	protected constructor(
		protected readonly dfg: DataflowInformation,
		private _domains: AINodeStore,
		public readonly name: string
	) { }

	enter(): void {
		aiLogger.trace(`Entered ${this.name}`)
	}

	exit(): AINodeStore {
		return this.domains.top
	}

	next(aiNodes: AINodeStore): void {
		aiLogger.trace(`${this.name} received`)
		this.domains.updateWith(aiNodes)
	}

	get domains(): AINodeStore {
		return this._domains
	}
}