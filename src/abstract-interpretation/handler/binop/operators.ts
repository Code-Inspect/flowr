import { addDomains, Domain, narrowDomain, NarrowKind, subtractDomains } from '../../domain'
import type { BinOpOperators } from './binop'
import { AINode, AINodeStore } from '../../ainode'
import type { ParentInformation } from '../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RBinaryOp } from '../../../r-bridge/lang-4.x/ast/model/nodes/r-binary-op'

const calculateComparisonDomains = (lhs: AINode, rhs: AINode, node: RBinaryOp<ParentInformation>, narrowKind: NarrowKind, idSuffix = ''): AINode[] => {
	const lhsNarrowed = narrowDomain(lhs.domain, rhs.domain, narrowKind)
	const rhsNarrowed = narrowDomain(rhs.domain, lhs.domain, narrowKind ^ 0b110 /* flip < and > but not = */)
	const isConditionTrue = lhsNarrowed.isBottom() && rhsNarrowed.isBottom()
	return [
		new AINode(isConditionTrue ? Domain.bottom() : Domain.top(), node, node.info.id, node.info.id + idSuffix),
		new AINode(lhsNarrowed, node, node.info.id, lhs.nodeId + idSuffix),
		new AINode(rhsNarrowed, node, node.info.id, rhs.nodeId + idSuffix),
	]
}

export const operators: BinOpOperators = {
	'<-': (lhs, rhs, node) => {
		return AINodeStore.from(new AINode(rhs.domain, node.lhs, node.info.id))
	},
	'+': (lhs, rhs, node) => {
		return AINodeStore.from(new AINode(addDomains(lhs.domain, rhs.domain), node))
	},
	'-': (lhs, rhs, node) => {
		return AINodeStore.from(new AINode(subtractDomains(lhs.domain, rhs.domain), node))
	},
	'<': (lhs, rhs, node) => {
		const narrowKind = NarrowKind.Smaller
		return AINodeStore.from(calculateComparisonDomains(lhs, rhs, node, narrowKind)
			.concat(calculateComparisonDomains(lhs, rhs, node, narrowKind ^0b111, '-else')))
	},
	'>': (lhs, rhs, node) => {
		const narrowKind = NarrowKind.Greater
		return AINodeStore.from(calculateComparisonDomains(lhs, rhs, node, narrowKind)
			.concat(calculateComparisonDomains(lhs, rhs, node, narrowKind ^0b111, '-else')))
	},
	'<=': (lhs, rhs, node) => {
		const narrowKind = NarrowKind.Smaller | NarrowKind.Equal
		return AINodeStore.from(calculateComparisonDomains(lhs, rhs, node, narrowKind)
			.concat(calculateComparisonDomains(lhs, rhs, node, narrowKind ^0b111, '-else')))
	},
	'>=': (lhs, rhs, node) => {
		const narrowKind = NarrowKind.Greater | NarrowKind.Equal
		return AINodeStore.from(calculateComparisonDomains(lhs, rhs, node, narrowKind)
			.concat(calculateComparisonDomains(lhs, rhs, node, narrowKind ^0b111, '-else')))
	},
}
