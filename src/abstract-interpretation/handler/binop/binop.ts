import type { Handler } from '../handler'
import type { AINode } from '../../processor'
import { aiLogger } from '../../processor'
import type { ParentInformation, RBinaryOp } from '../../../r-bridge'
import { guard } from '../../../util/assert'
import { operators } from './operators'

export type BinaryOpProcessor = (lhs: AINode, rhs: AINode, node: RBinaryOp<ParentInformation>) => AINode

export class BinOp implements Handler<AINode> {
	lhs: AINode | undefined
	rhs: AINode | undefined

	constructor(readonly node: RBinaryOp<ParentInformation>) {}

	getName(): string {
		return `Bin Op (${this.node.operator})`
	}

	enter(): void {
		aiLogger.trace(`Entered ${this.getName()}`)
	}

	exit(): AINode {
		aiLogger.trace(`Exited ${this.getName()}`)
		guard(this.lhs !== undefined, `No LHS found for assignment ${this.node.info.id}`)
		guard(this.rhs !== undefined, `No RHS found for assignment ${this.node.info.id}`)
		const processor: BinaryOpProcessor | undefined = operators[this.node.operator]
		guard(processor !== undefined, `No processor found for binary operator ${this.node.operator}`)
		return processor(this.lhs, this.rhs, this.node)
	}

	next(node: AINode): void {
		aiLogger.trace(`${this.getName()} received`)
		if(this.lhs === undefined) {
			this.lhs = node
		} else if(this.rhs === undefined) {
			this.rhs = node
		} else {
			guard(false, `BinOp ${this.node.info.id} already has both LHS and RHS`)
		}
	}
}
