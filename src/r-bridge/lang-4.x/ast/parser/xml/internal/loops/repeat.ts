import type { NamedXmlBasedJson } from '../../input-format'
import { ensureExpressionList, retrieveMetaStructure } from '../meta'
import type { ParserData } from '../../data'
import { tryNormalizeSingleNode } from '../structure'
import type { RRepeatLoop } from '../../../../model'
import { RawRType, RType } from '../../../../model'
import { guard } from '../../../../../../../util/assert'
import { executeHook, executeUnknownHook } from '../../hooks'
import { parseLog } from '../../../json/parser'

/**
 * Try to parse the construct as a {@link RRepeatLoop}.
 *
 * @param data - The data used by the parser (see {@link ParserData})
 * @param repeatToken - Token which represents the `repeat` keyword
 * @param body - The `body` of the repeat-loop
 *
 * @returns The parsed {@link RRepeatLoop} or `undefined` if the given construct is not a repeat-loop
 */
export function tryNormalizeRepeat(data: ParserData, repeatToken: NamedXmlBasedJson, body: NamedXmlBasedJson): RRepeatLoop | undefined {
	if(repeatToken.name !== RawRType.Repeat) {
		parseLog.debug('encountered non-repeat token for supposed repeat-loop structure')
		return executeUnknownHook(data.hooks.loops.onRepeatLoop.unknown, data, { repeatToken, body })
	}

	parseLog.debug('trying to parse repeat-loop');
	({ repeatToken, body } = executeHook(data.hooks.loops.onRepeatLoop.before, data, { repeatToken, body }))

	const parseBody = tryNormalizeSingleNode(data, body)
	guard(parseBody.type !== RType.Delimiter, () => `no body for repeat-loop ${JSON.stringify(repeatToken)} (${JSON.stringify(body)})`)

	const {
		location,
		content
	} = retrieveMetaStructure(repeatToken.content)
	const result: RRepeatLoop = {
		type:   RType.RepeatLoop,
		location,
		lexeme: content,
		body:   ensureExpressionList(parseBody),
		info:   {
			fullRange:        data.currentRange,
			additionalTokens: [],
			fullLexeme:       data.currentLexeme
		}
	}
	return executeHook(data.hooks.loops.onRepeatLoop.after, data, result)
}
