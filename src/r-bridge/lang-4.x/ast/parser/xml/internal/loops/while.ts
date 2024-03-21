import type { NamedXmlBasedJson } from '../../input-format'
import { XmlParseError } from '../../input-format'
import { ensureExpressionList, retrieveMetaStructure } from '../meta'
import { tryNormalizeSingleNode } from '../structure'
import type { ParserData } from '../../data'
import type { RWhileLoop } from '../../../../model'
import { RawRType, RType } from '../../../../model'
import { executeHook, executeUnknownHook } from '../../hooks'
import { parseLog } from '../../../json/parser'

export function tryNormalizeWhile(
	data: ParserData,
	whileToken: NamedXmlBasedJson,
	leftParen: NamedXmlBasedJson,
	condition: NamedXmlBasedJson,
	rightParen: NamedXmlBasedJson,
	body: NamedXmlBasedJson
): RWhileLoop | undefined {
	if(whileToken.name !== RawRType.While) {
		parseLog.debug(
			'encountered non-while token for supposed while-loop structure'
		)
		return executeUnknownHook(data.hooks.loops.onWhileLoop.unknown, data, { whileToken, leftParen, condition, rightParen, body })
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

	parseLog.debug(
		'trying to parse while-loop'
	)


	const parsedCondition = tryNormalizeSingleNode(data, condition)
	const parseBody = tryNormalizeSingleNode(data, body)

	if(parsedCondition.type === RType.Delimiter || parseBody.type === RType.Delimiter) {
		throw new XmlParseError(
			`unexpected under-sided while-loop, received ${JSON.stringify([
				parsedCondition,
				parseBody,
			])} for ${JSON.stringify([whileToken, condition, body])}`
		)
	}

	const { location, content } = retrieveMetaStructure(whileToken.content)

	const result: RWhileLoop = {
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
	return executeHook(data.hooks.loops.onWhileLoop.after, data, result)
}
