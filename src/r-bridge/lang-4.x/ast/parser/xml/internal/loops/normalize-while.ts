import type { NormalizerData } from '../../normalizer-data'
import type { NamedXmlBasedJson } from '../../input-format'
import { XmlParseError } from '../../input-format'
import type { RWhileLoop } from '../../../../model'
import { RawRType, RType } from '../../../../model'
import { parseLog } from '../../../json/parser'
import { normalizeSingleNode } from '../structure'
import { ensureExpressionList, retrieveMetaStructure } from '../../normalize-meta'

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
