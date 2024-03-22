import type { RNa } from '../../../../../values'
import { boolean2ts, isBoolean, isNA, number2ts } from '../../../../../values'
import { retrieveMetaStructure } from '../meta'
import type { RLogical, RSymbol, NoInfo, RNumber } from '../../../../model'
import { RType } from '../../../../model'
import type { ParserData } from '../../data'
import { executeHook } from '../../hooks'
import { parseLog } from '../../../json/parser'
import type { JsonEntry } from '../../../json/format'

/**
 * Normalize the given entry as a R number (see {@link number2ts}), supporting booleans (see {@link boolean2ts}),
 * and special values.
 * This requires you to check the corresponding name beforehand.
 *
 * @param data  - The data used by the parser (see {@link ParserData})
 * @param entry - The json object to extract the meta-information from
 */
export function normalizeNumber(data: ParserData, entry: JsonEntry): RNumber | RLogical | RSymbol<NoInfo, typeof RNa> {
	parseLog.debug('[number]')
	entry = executeHook(data.hooks.values.onNumber.before, data, entry)

	const { location, content } = retrieveMetaStructure(entry)
	const common = {
		location,
		lexeme: content,
		info:   {
			fullRange:        data.currentRange,
			additionalTokens: [],
			fullLexeme:       data.currentLexeme
		}
	}

	let result:  RNumber | RLogical | RSymbol<NoInfo, typeof RNa>
	/* the special symbol */
	if(isNA(content)) {
		result = {
			...common,
			namespace: undefined,
			type:      RType.Symbol,
			content
		}
	} else if(isBoolean(content)) {
		result = {
			...common,
			type:    RType.Logical,
			content: boolean2ts(content)
		}
	} else {
		result = {
			...common,
			type:    RType.Number,
			content: number2ts(content)
		}
	}
	return executeHook(data.hooks.values.onNumber.after, data, result)
}
