import type { ParserData } from '../../data'
import type { NamedXmlBasedJson } from '../../input-format'
import type {
	RNode, RUnaryOp
} from '../../../../model'
import {
	RType,
	OperatorsInRAst
} from '../../../../model'
import { parseLog } from '../../../json/parser'
import { tryNormalizeSingleNode } from '../structure'
import { retrieveMetaStructure, retrieveOpName } from '../../meta'
import { guard } from '../../../../../../../util/assert'
import { expensiveTrace } from '../../../../../../../util/log'


/**
 * Parses the construct as a {@link RUnaryOp} (automatically identifies the flavor).
 *
 * @param data     - The data used by the parser (see {@link ParserData})
 * @param operator - The operator token
 * @param operand  - The operand of the unary operator
 *
 * @returns The parsed {@link RUnaryOp} or `undefined` if the given construct is not a unary operator
 */
export function tryNormalizeUnary(data: ParserData, operator: NamedXmlBasedJson, operand: NamedXmlBasedJson): RNode | undefined {
	expensiveTrace(parseLog, () => `unary op for ${operator.name} ${operand.name}`)

	if(OperatorsInRAst.has(operator.name)) {
		return parseUnaryOp(data, operator, operand)
	} else {
		return undefined
	}
}

function parseUnaryOp(data: ParserData, operator: NamedXmlBasedJson, operand: NamedXmlBasedJson): RUnaryOp {
	const parsedOperand = tryNormalizeSingleNode(data, operand)

	guard(parsedOperand.type !== RType.Delimiter, () => 'unexpected under-sided unary op')

	const operationName = retrieveOpName(operator)
	const { location, content } = retrieveMetaStructure(operator.content)

	return {
		type:     RType.UnaryOp,
		location,
		operator: operationName,
		lexeme:   content,
		operand:  parsedOperand,
		info:     {
			fullRange:        data.currentRange,
			additionalTokens: [],
			fullLexeme:       data.currentLexeme
		}
	}
}
