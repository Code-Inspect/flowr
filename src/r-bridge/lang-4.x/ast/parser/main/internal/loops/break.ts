import type { ParserData } from '../../data'
import type { JsonEntry } from '../../../json/format'
import { executeHook } from '../../hooks'
import { retrieveMetaStructure } from '../meta'
import type { RBreak } from '../../../../model'
import { RType } from '../../../../model'
import { parseLog } from '../../../json/parser'

export function normalizeBreak(data: ParserData, entry: JsonEntry): RBreak {
	parseLog.debug(`[break] try: ${JSON.stringify(entry)}`)
	entry = executeHook(data.hooks.loops.onBreak.before, data, entry)

	const { location, content } = retrieveMetaStructure(entry)

	const result: RBreak = {
		type:   RType.Break,
		location,
		lexeme: content,
		info:   {
			fullRange:        location,
			additionalTokens: [],
			fullLexeme:       content
		}
	}
	return executeHook(data.hooks.loops.onBreak.after, data, result)
}
