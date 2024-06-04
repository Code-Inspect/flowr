import { assertUnreachable, guard } from '../util/assert'
import type { Domain } from './domain'
import { unifyDomains } from './domain'
import type { ParentInformation, RNodeWithParent } from '../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { NodeId } from '../r-bridge/lang-4.x/ast/model/processing/node-id'

export class AINode {
	constructor(
		public readonly domain: Domain,
		public readonly astNode: RNodeWithParent<ParentInformation>,
		/** The ID of the whole expression that the domain was calculated from (e.g. the whole assignment expression) */
		public readonly expressionId: NodeId = astNode.info.id,
		/** The ID of the node that logically holds the domain (e.g. the lhs of an assignment) */
		public readonly nodeId: NodeId = astNode.info.id
	) {}

	static copy(node: AINode, changes: Partial<AINode>): AINode {
		return new AINode(
			changes.domain ?? node.domain,
			changes.astNode ?? node.astNode,
			changes.expressionId ?? node.expressionId,
			changes.nodeId ?? node.nodeId
		)
	}
}

export const enum RegisterBehavior {
	Overwrite,
	Ignore,
	Fail,
	Merge
}

export class AINodeStore implements Iterable<AINode> {
	private readonly map: Map<NodeId, AINode>

	private constructor(content: AINode[] | AINode | undefined = undefined, private readonly parent: AINodeStore | undefined = undefined) {
		if(Array.isArray(content)) {
			this.map = new Map(content.map(node => [node.nodeId, node]))
		} else if(content !== undefined) {
			this.map = new Map([[content.nodeId, content]])
		} else if(content === undefined) {
			this.map = new Map()
		} else {
			assertUnreachable(content)
		}
	}

	static empty(): AINodeStore {
		return new AINodeStore()
	}

	static from(content: AINode[] | AINode): AINodeStore {
		return new AINodeStore(content)
	}

	static withParent(parent: AINodeStore): AINodeStore {
		return new AINodeStore(undefined, parent)
	}

	has(id: NodeId): boolean {
		return this.map.has(id) || (this.parent?.has(id) ?? false)
	}

	get(id: NodeId | undefined): AINode | undefined {
		if(id === undefined) {
			return undefined
		}
		return this.map.get(id) ?? this.parent?.get(id)
	}

	get size(): number {
		return this.map.size + (this.parent?.size ?? 0)
	}

	get top(): AINodeStore {
		return new AINodeStore(Array.from(this.map.values()), undefined)
	}

	register(node: AINode, behavior: RegisterBehavior = RegisterBehavior.Fail): void {
		const existing = this.get(node.nodeId)
		if(existing !== undefined) {
			switch(behavior) {
				case RegisterBehavior.Overwrite:
					// Even if a parent contains the node, we will set it in the top store, so
					// outer scopes are not affected by inner scopes
					this.map.set(node.nodeId, node)
					break
				case RegisterBehavior.Ignore:
					break
				case RegisterBehavior.Fail:
					return guard(existing === node, `Node with ID ${node.nodeId} already exists in the store`)
				case RegisterBehavior.Merge: {
					const existing = this.map.get(node.nodeId)
					guard(existing !== undefined, `Node with ID ${node.nodeId} should exist`)
					this.register(AINode.copy(node, { domain: unifyDomains([existing.domain, node.domain]) }), RegisterBehavior.Overwrite)
					break
				}
				default: assertUnreachable(behavior)
			}
		} else {
			this.map.set(node.nodeId, node)
		}
	}

	[Symbol.iterator](): Iterator<AINode> {
		return composeIterators(this.map.values(), this.parent?.[Symbol.iterator]())
	}

	updateWith(domains: AINodeStore): void {
		for(const node of domains) {
			this.register(node, RegisterBehavior.Overwrite)
		}
	}
}

function* composeIterators<T>(first: Iterator<T>, second: Iterator<T> | undefined): Iterator<T> {
	let result = first.next()
	while(!result.done) {
		yield result.value
		result = first.next()
	}

	if(second === undefined) {
		return
	}

	result = second.next()
	while(!result.done) {
		yield result.value
		result = second.next()
	}
}
