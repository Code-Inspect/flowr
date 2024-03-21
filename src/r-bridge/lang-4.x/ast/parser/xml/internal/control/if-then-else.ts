import type { NamedXmlBasedJson } from '../../input-format'
import { tryNormalizeSingleNode } from '../structure'
import type { ParserData } from '../../data'
import { tryNormalizeIfThen } from './if-then'
import { guard } from '../../../../../../../util/assert'
import type { RIfThenElse } from '../../../../model'
import { RawRType, RType } from '../../../../model'
import { executeHook, executeUnknownHook } from '../../hooks'
import { ensureExpressionList } from '../meta'
import { parseLog } from '../../../json/parser'

/**
 * Try to parse the construct as a {@link RIfThenElse}.
 */
export function tryNormalizeIfThenElse(
	data: ParserData,
	tokens: [
		ifToken:    NamedXmlBasedJson,
		leftParen:  NamedXmlBasedJson,
		condition:  NamedXmlBasedJson,
		rightParen: NamedXmlBasedJson,
		then:       NamedXmlBasedJson,
		elseToken:  NamedXmlBasedJson,
		elseBlock:  NamedXmlBasedJson
	]): RIfThenElse | undefined {
	// we start by parsing a regular if-then structure
	parseLog.trace('trying to parse if-then-else structure')
	tokens = executeHook(data.hooks.control.onIfThenElse.before, data, tokens)

	const parsedIfThen = tryNormalizeIfThen(data, [tokens[0], tokens[1], tokens[2], tokens[3], tokens[4]])
	if(parsedIfThen === undefined) {
		return executeUnknownHook(data.hooks.control.onIfThenElse.unknown, data, tokens)
	}
	parseLog.trace('if-then part successful, now parsing else part')
	guard(tokens[5].name === RawRType.Else, () => `expected else token for if-then-else but found ${JSON.stringify(tokens[5])}`)

	const parsedElse = tryNormalizeSingleNode(data, tokens[6])
	guard(parsedElse.type !== RType.Delimiter, () => `unexpected missing else-part of if-then-else, received ${JSON.stringify([parsedIfThen, parsedElse])} for ${JSON.stringify(tokens)}`)

	const result: RIfThenElse = {
		...parsedIfThen,
		otherwise: ensureExpressionList(parsedElse)
	}
	return executeHook(data.hooks.control.onIfThenElse.after, data, result)
}
