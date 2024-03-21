import type { Handler } from '../handler'
import type { AINode } from '../../processor'
import { aiLogger } from '../../processor'
import type { BinaryOperatorFlavor, ParentInformation, RBinaryOp } from '../../../r-bridge'
import { guard } from '../../../util/assert'
import { operators } from './operators'

export type BinOpOperators = {
	[key in BinaryOperatorFlavor]: (lhs: AINode, rhs: AINode, node: RBinaryOp<ParentInformation>) => AINode
}

export class BinOp implements Handler<AINode> {
	lhs: AINode | undefined
	rhs: AINode | undefined

	constructor(readonly node: RBinaryOp<ParentInformation>) {}

	getName(): string {
		return `Bin Op (${this.node.flavor})`
	}

	enter(): void {
		aiLogger.trace(`Entered ${this.getName()}`)
	}

	exit(): AINode {
		aiLogger.trace(`Exited ${this.getName()}`)
		guard(this.lhs !== undefined, `No LHS found for assignment ${this.node.info.id}`)
		guard(this.rhs !== undefined, `No RHS found for assignment ${this.node.info.id}`)
		return operators[this.node.flavor](this.lhs, this.rhs, this.node)
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