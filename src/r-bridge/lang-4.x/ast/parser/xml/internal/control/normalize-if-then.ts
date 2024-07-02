import type { NormalizerData } from '../../normalizer-data'
import type { NamedXmlBasedJson } from '../../input-format'
import { XmlParseError } from '../../input-format'
import { parseLog } from '../../../json/parser'
import { ensureExpressionList, retrieveMetaStructure } from '../../normalize-meta'
import { RawRType, RType } from '../../../../model/type'
import type { RIfThenElse } from '../../../../model/nodes/r-if-then-else'
import { normalizeSingleNode } from '../structure/normalize-single-node'


/**
 * Try to parse the construct as a {@link RIfThenElse}.
 */
export function tryNormalizeIfThen(
	data: NormalizerData,
	tokens: [
		ifToken:    NamedXmlBasedJson,
		leftParen:  NamedXmlBasedJson,
		condition:  NamedXmlBasedJson,
		rightParen: NamedXmlBasedJson,
		then:       NamedXmlBasedJson
	]): RIfThenElse | undefined {
	parseLog.trace('trying to parse if-then structure')
	if(tokens[0].name !== RawRType.If) {
		parseLog.debug('encountered non-if token for supposed if-then structure')
		return undefined
	} else if(tokens[1].name !== RawRType.ParenLeft) {
		throw new XmlParseError(`expected left-parenthesis for if but found ${JSON.stringify(tokens[1])}`)
	} else if(tokens[3].name !== RawRType.ParenRight) {
		throw new XmlParseError(`expected right-parenthesis for if but found ${JSON.stringify(tokens[3])}`)
	}

	const parsedCondition = normalizeSingleNode(data, tokens[2])
	const parsedThen = normalizeSingleNode(data, tokens[4])


	if(parsedCondition.type === RType.Delimiter || parsedThen.type === RType.Delimiter) {
		throw new XmlParseError(`unexpected missing parts of if, received ${JSON.stringify([parsedCondition, parsedThen])} for ${JSON.stringify(tokens)}`)
	}

	const { location, content } = retrieveMetaStructure(tokens[0].content)

	return {
		type:      RType.IfThenElse,
		condition: parsedCondition,
		then:      ensureExpressionList(parsedThen),
		location,
		lexeme:    content,
		info:      {
			fullRange:        data.currentRange,
			additionalTokens: [],
			fullLexeme:       data.currentLexeme
		}
	}
}
