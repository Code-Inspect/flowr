import type {
	BinaryOperatorFlavor } from '../../../../model'
import {
	ArithmeticOperatorsRAst,
	ComparisonOperatorsRAst,
	LogicalOperatorsRAst
} from '../../../../model'

/**
 * Identify the flavor of a given operator, as we do not really have a use for "special"
 * operators within our internal AST.
 */
export function identifySpecialOp(content: string): BinaryOperatorFlavor | 'special' {
	if(ComparisonOperatorsRAst.has(content)) {
		return 'comparison'
	} else if(LogicalOperatorsRAst.has(content)) {
		return 'logical'
	} else if(ArithmeticOperatorsRAst.has(content)) {
		return 'arithmetic'
	} else {
		return 'special'
	}
}
