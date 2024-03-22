import type { ParserData } from '../../data'
import type { JsonEntry } from '../../../json/format'
import { executeHook } from '../../hooks'
import { retrieveMetaStructure } from '../meta'
import type { RNext } from '../../../../model'
import { RType } from '../../../../model'
import { parseLog } from '../../../json/parser'

export function normalizeNext(data: ParserData, entry: JsonEntry): RNext {
	parseLog.debug(`[next] try: ${JSON.stringify(entry)}`)
	entry = executeHook(data.hooks.loops.onNext.before, data, entry)

	const { location, content } = retrieveMetaStructure(entry)

	const result: RNext = {
		type:   RType.Next,
		location,
		lexeme: content,
		info:   {
			fullRange:        data.currentRange,
			additionalTokens: [],
			fullLexeme:       data.currentLexeme
		}
	}
	return executeHook(data.hooks.loops.onNext.after, data, result)
}
