import { guard } from '../../../util/assert'
import type { BinOpOperators } from './binop'
import { addDomains, subtractDomains } from '../../domain'

export const operators: BinOpOperators = {
	'assignment': (lhs, rhs, node) => {
		return {
			id:      lhs.id,
			domain:  rhs.domain,
			astNode: node.lhs,
		}
	},
	'arithmetic': (lhs, rhs, node) => {
		switch(node.operator) {
			case '+':
				return {
					id:      lhs.id,
					domain:  addDomains(lhs.domain, rhs.domain),
					astNode: node,
				}
			case '-':
				return {
					id:      lhs.id,
					domain:  subtractDomains(lhs.domain, rhs.domain),
					astNode: node,
				}
			default:
				guard(false, `Unknown binary operator ${node.operator}`)
		}
	},
	'logical': () => {
		guard(false, 'Not implemented yet')
	},
	'model formula': () => {
		guard(false, 'Not implemented yet')
	},
	'comparison': () => {
		guard(false, 'Not implemented yet')
	},
}
