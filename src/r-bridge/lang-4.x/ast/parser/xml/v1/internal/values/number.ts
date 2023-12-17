import { XmlBasedJson } from '../../input-format'
import { boolean2ts, isBoolean, isNA, number2ts, RNa } from '../../../../../../values'
import { parseLog } from '../../normalize'
import { retrieveMetaStructure } from '../meta'
import { RType, RLogical, RSymbol, NoInfo, RNumber } from '../../../../../model'
import { ParserData } from '../../data'
import { executeHook } from '../../hooks'

/**
 * Normalize the given object as a R number (see {@link number2ts}), supporting booleans (see {@link boolean2ts}),
 * and special values.
 * This requires you to check the corresponding name beforehand.
 *
 * @param data - The data used by the parser (see {@link ParserData})
 * @param obj  - The json object to extract the meta-information from
 */
export function normalizeNumber(data: ParserData, obj: XmlBasedJson): RNumber | RLogical | RSymbol<NoInfo, typeof RNa> {
	parseLog.debug('[number]')
	obj = executeHook(data.hooks.values.onNumber.before, data, obj)

	const { location, content } = retrieveMetaStructure(data.config, obj)
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
