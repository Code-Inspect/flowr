import type { ParserData } from '../../data'
import type { XmlBasedJson } from '../../input-format'
import { executeHook } from '../../hooks'
import { retrieveMetaStructure } from '../meta'
import type { RBreak } from '../../../../model'
import { RType } from '../../../../model'
import { parseLog } from '../../../json/parser'

export function normalizeBreak(data: ParserData, obj: XmlBasedJson): RBreak {
	parseLog.debug(`[break] try: ${JSON.stringify(obj)}`)
	obj = executeHook(data.hooks.loops.onBreak.before, data, obj)

	const { location, content } = retrieveMetaStructure(obj)

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
