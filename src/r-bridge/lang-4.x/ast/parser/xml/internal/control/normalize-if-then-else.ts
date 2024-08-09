import type { NormalizerData } from '../../normalizer-data'
import type { NamedXmlBasedJson } from '../../input-format'
import { parseLog } from '../../../json/parser'
import { tryNormalizeIfThen } from './normalize-if-then'
import { guard } from '../../../../../../../util/assert'
import { ensureExpressionList } from '../../normalize-meta'
import type { RIfThenElse } from '../../../../model/nodes/r-if-then-else'
import { normalizeSingleNode } from '../structure/normalize-single-node'
import { RawRType, RType } from '../../../../model/type'


/**
 * Try to parse the construct as a {@link RIfThenElse}.
 */
export function tryNormalizeIfThenElse(
	data: NormalizerData,
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

	const parsedIfThen = tryNormalizeIfThen(data, [tokens[0], tokens[1], tokens[2], tokens[3], tokens[4]])
	if(parsedIfThen === undefined) {
		return undefined
	}
	parseLog.trace('if-then part successful, now parsing else part')
	guard(tokens[5].name === RawRType.Else, () => `expected else token for if-then-else but found ${JSON.stringify(tokens[5])}`)

	const parsedElse = normalizeSingleNode(data, tokens[6])
	guard(parsedElse.type !== RType.Delimiter, () => `unexpected missing else-part of if-then-else, received ${JSON.stringify([parsedIfThen, parsedElse])} for ${JSON.stringify(tokens)}`)

	return {
		...parsedIfThen,
		otherwise: ensureExpressionList(parsedElse)
	}
}
