import { type RNumberValue, RType, RExpressionList, RNode, RParameter } from '../../../src/r-bridge'
import { SourceRange } from '../../../src/util/range'

const emptyInfo = { fullRange: undefined, additionalTokens: [], fullLexeme: undefined }

export function exprList(...children: RNode[]): RExpressionList {
	return { type: RType.ExpressionList, children, lexeme: undefined, info: emptyInfo }
}
export function numVal(value: number, markedAsInt = false, complexNumber = false): RNumberValue {
	return { num: value, markedAsInt, complexNumber }
}

export function parameter(name: string, location: SourceRange, defaultValue?: RNode, special = false): RParameter  {
	return {
		type:   RType.Parameter,
		location,
		special,
		lexeme: name,
		defaultValue,
		name:   {
			type:      RType.Symbol,
			location,
			lexeme:    name,
			content:   name,
			namespace: undefined,
			info:      emptyInfo
		},
		info: emptyInfo
	}
}


