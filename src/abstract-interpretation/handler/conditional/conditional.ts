import { guard } from '../../../util/assert'
import { AINode, AINodeStore, RegisterBehavior } from '../../ainode'
import { aiLogger, getDfgChildrenOfType } from '../../processor'
import { Handler } from '../handler'
import type { DataflowInformation } from '../../../dataflow/info'
import type { RIfThenElse } from '../../../r-bridge/lang-4.x/ast/model/nodes/r-if-then-else'
import type { ParentInformation } from '../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import { EdgeType } from '../../../dataflow/graph/edge'

export class Conditional extends Handler {
	condition: AINodeStore | undefined
	then:      AINodeStore | undefined
	else:      AINodeStore | undefined
	// TODO: They are pretty unnecessary, and only here 'cause we use then and else to indicate which we already handled
	thenDomains = AINodeStore.empty()
	elseDomains = AINodeStore.empty()

	constructor(
		dfg: DataflowInformation,
		domains: AINodeStore,
		private readonly node: RIfThenElse<ParentInformation>
	) {
		super(dfg, domains, 'IfThenElse')
	}

	exit(): AINodeStore {
		aiLogger.trace(`Exited ${this.name}`)
		guard(this.condition !== undefined, `No condition found for conditional ${this.node.info.id}`)
		guard(this.then !== undefined, `No then-branch found for conditional ${this.node.info.id}`)

		const result = AINodeStore.empty()
		for(const conditionNode of this.condition) {
			result.register(conditionNode)
		}
		for(const thenNode of this.then) {
			result.register(thenNode)
		}
		for(const elseNode of this.else ?? []) {
			result.register(elseNode)
		}

		return result
	}

	next(aiNodes: AINodeStore): void {
		aiLogger.trace(`${this.name} received`)
		if(this.condition === undefined) {
			this.condition = aiNodes
			for(const node of aiNodes) {
				const isElseNode = node.nodeId.toString().endsWith('-else')
				const cleanedId = isElseNode ? node.nodeId.toString().slice(0, -5) : node.nodeId
				const dfChildren = getDfgChildrenOfType(cleanedId, this.dfg, EdgeType.Reads)
				if(dfChildren === undefined) {
					if(isElseNode) {
						this.elseDomains.register(AINode.copy(node, { nodeId: cleanedId }), RegisterBehavior.Overwrite)
					} else {
						this.thenDomains.register(node, RegisterBehavior.Overwrite)
					}
				} else {
					for(const child of dfChildren) {
						if(isElseNode) {
							this.elseDomains.register(AINode.copy(node, { nodeId: child }), RegisterBehavior.Overwrite)
						} else {
							this.thenDomains.register(AINode.copy(node, { nodeId: child }), RegisterBehavior.Overwrite)
						}
					}
				}
			}
			this.domains.updateWith(this.thenDomains)
		} else if(this.then === undefined) {
			this.then = AINodeStore.empty()
			const conditionDomain = this.thenDomains.get(this.node.condition.info.id)?.domain
			guard(conditionDomain !== undefined, `No domain found for condition ${this.node.condition.info.id}`)
			if(!conditionDomain.isBottom()) {
				this.then.updateWith(aiNodes)
			}
			this.domains.updateWith(this.elseDomains)
		} else if(this.else === undefined) {
			this.else = AINodeStore.empty()
			const conditionDomain = this.elseDomains.get(this.node.condition.info.id)?.domain
			guard(conditionDomain !== undefined, `No domain found for condition ${this.node.condition.info.id}`)
			if(!conditionDomain.isBottom()) {
				this.else.updateWith(aiNodes)
			}
		} else {
			guard(false, `Conditional ${this.node.info.id} already has condition, then and else`)
		}
	}
}