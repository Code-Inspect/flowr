import type { SourceRange } from '../../../src/util/range'
import type { RNode } from '../../../src/r-bridge/lang-4.x/ast/model/model'
import type { RExpressionList } from '../../../src/r-bridge/lang-4.x/ast/model/nodes/r-expression-list'
import { RType } from '../../../src/r-bridge/lang-4.x/ast/model/type'
import type { RNumberValue } from '../../../src/r-bridge/lang-4.x/convert-values'
import type { RParameter } from '../../../src/r-bridge/lang-4.x/ast/model/nodes/r-parameter'

const emptyInfo = { fullRange: undefined, additionalTokens: [], fullLexeme: undefined, depth: 0 }

export function exprList(...children: RNode[]): RExpressionList {
	return { type: RType.ExpressionList, children, lexeme: undefined, info: emptyInfo, grouping: undefined, location: undefined }
}
export function numVal(value: number, markedAsInt = false, complexNumber = false): RNumberValue {
	return { num: value, markedAsInt, complexNumber }
}

export function parameter(name: string, location: SourceRange, defaultValue?: RNode, special = false): RParameter {
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
