import type { NormalizerData } from '../../normalizer-data'
import type { NamedXmlBasedJson } from '../../input-format'
import { XmlParseError } from '../../input-format'
import { parseLog } from '../../../json/parser'
import { ensureExpressionList, retrieveMetaStructure } from '../../normalize-meta'
import { RawRType, RType } from '../../../../model/type'
import type { RWhileLoop } from '../../../../model/nodes/r-while-loop'
import { normalizeSingleNode } from '../structure/normalize-single-node'

export function tryNormalizeWhile(
	data: NormalizerData,
	[whileToken, leftParen, condition, rightParen, body]: [NamedXmlBasedJson, NamedXmlBasedJson, NamedXmlBasedJson, NamedXmlBasedJson, NamedXmlBasedJson]
): RWhileLoop | undefined {
	if(whileToken.name !== RawRType.While) {
		parseLog.debug(
			'encountered non-while token for supposed while-loop structure'
		)
		return undefined
	} else if(leftParen.name !== RawRType.ParenLeft) {
		throw new XmlParseError(
			`expected left-parenthesis for while but found ${JSON.stringify(
				leftParen
			)}`
		)
	} else if(rightParen.name !== RawRType.ParenRight) {
		throw new XmlParseError(
			`expected right-parenthesis for while but found ${JSON.stringify(
				rightParen
			)}`
		)
	}

	parseLog.debug('trying to parse while-loop')


	const parsedCondition = normalizeSingleNode(data, condition)
	const parseBody = normalizeSingleNode(data, body)

	if(parsedCondition.type === RType.Delimiter || parseBody.type === RType.Delimiter) {
		throw new XmlParseError(
			`unexpected under-sided while-loop, received ${JSON.stringify([
				parsedCondition,
				parseBody,
			])} for ${JSON.stringify([whileToken, condition, body])}`
		)
	}

	const { location, content } = retrieveMetaStructure(whileToken.content)

	return {
		type:      RType.WhileLoop,
		condition: parsedCondition,
		body:      ensureExpressionList(parseBody),
		lexeme:    content,
		location,
		info:      {
			fullRange:        data.currentRange,
			additionalTokens: [],
			fullLexeme:       data.currentLexeme
		}
	}
}
