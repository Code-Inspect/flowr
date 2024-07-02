import type { BinaryOpProcessor } from './binop'
import { addDomains, subtractDomains } from '../../domain'

export const operators: Record<string, BinaryOpProcessor> = {
	'<-': (lhs, rhs, node) => {
		return {
			id:      lhs.id,
			domain:  rhs.domain,
			astNode: node.lhs,
		}
	},
	'+': (lhs, rhs, node) => {
		return {
			id:      lhs.id,
			domain:  addDomains(lhs.domain, rhs.domain),
			astNode: node,
		}
	},
	'-': (lhs, rhs, node) => {
		return {
			id:      lhs.id,
			domain:  subtractDomains(lhs.domain, rhs.domain),
			astNode: node,
		}
	}
}
