import type { NormalizerData } from '../../normalizer-data'
import type { NamedXmlBasedJson } from '../../input-format'
import type { RRepeatLoop } from '../../../../model'
import { RawRType, RType } from '../../../../model'
import { parseLog } from '../../../json/parser'
import { normalizeSingleNode } from '../structure'
import { guard } from '../../../../../../../util/assert'
import { ensureExpressionList, retrieveMetaStructure } from '../../normalize-meta'

/**
 * Try to parse the construct as a {@link RRepeatLoop}.
 *
 * @param data - The data used by the parser (see {@link NormalizerData})
 * @param repeatToken - Token which represents the `repeat` keyword
 * @param bodyToken - The `body` of the repeat-loop
 *
 * @returns The parsed {@link RRepeatLoop} or `undefined` if the given construct is not a repeat-loop
 */
export function tryNormalizeRepeat(data: NormalizerData, [repeatToken, bodyToken]: [NamedXmlBasedJson, NamedXmlBasedJson]): RRepeatLoop | undefined {
	if(repeatToken.name !== RawRType.Repeat) {
		parseLog.debug('encountered non-repeat token for supposed repeat-loop structure')
		return undefined
	}

	parseLog.debug('trying to parse repeat-loop')

	const parseBody = normalizeSingleNode(data, bodyToken)
	guard(parseBody.type !== RType.Delimiter, () => `no body for repeat-loop ${JSON.stringify(repeatToken)} (${JSON.stringify(bodyToken)})`)

	const { location, content } = retrieveMetaStructure(repeatToken.content)

	return {
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
}
