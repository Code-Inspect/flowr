import type { NamedJsonEntry } from '../../../json/format'
import { ParseError } from '../../data'
import { tryNormalizeSingleNode } from '../structure'
import { ensureExpressionList, retrieveMetaStructure } from '../meta'
import type { ParserData } from '../../data'
import type { RIfThenElse } from '../../../../model'
import { RawRType, RType } from '../../../../model'
import { executeHook, executeUnknownHook } from '../../hooks'
import { parseLog } from '../../../json/parser'

/**
 * Try to parse the construct as a {@link RIfThenElse}.
 */
export function tryNormalizeIfThen(
	data: ParserData,
	tokens: [
		ifToken:    NamedJsonEntry,
		leftParen:  NamedJsonEntry,
		condition:  NamedJsonEntry,
		rightParen: NamedJsonEntry,
		then:       NamedJsonEntry
	]): RIfThenElse | undefined {
	parseLog.trace('trying to parse if-then structure')
	if(tokens[0].name !== RawRType.If) {
		parseLog.debug('encountered non-if token for supposed if-then structure')
		return executeUnknownHook(data.hooks.control.onIfThen.unknown, data, tokens)
	} else if(tokens[1].name !== RawRType.ParenLeft) {
		throw new ParseError(`expected left-parenthesis for if but found ${JSON.stringify(tokens[1])}`)
	} else if(tokens[3].name !== RawRType.ParenRight) {
		throw new ParseError(`expected right-parenthesis for if but found ${JSON.stringify(tokens[3])}`)
	}

	tokens = executeHook(data.hooks.control.onIfThen.before, data, tokens)

	const parsedCondition = tryNormalizeSingleNode(data, tokens[2])
	const parsedThen = tryNormalizeSingleNode(data, tokens[4])


	if(parsedCondition.type === RType.Delimiter || parsedThen.type === RType.Delimiter) {
		throw new ParseError(`unexpected missing parts of if, received ${JSON.stringify([parsedCondition, parsedThen])} for ${JSON.stringify(tokens)}`)
	}

	const { location, content } = retrieveMetaStructure(tokens[0].content)

	const result: RIfThenElse = {
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
	return executeHook(data.hooks.control.onIfThen.after, data, result)
}
