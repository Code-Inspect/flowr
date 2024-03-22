import type { RComment } from '../../../../model'
import { RType } from '../../../../model'
import { retrieveMetaStructure } from '../meta'
import { guard } from '../../../../../../../util/assert'
import { executeHook } from '../../hooks'
import type { ParserData } from '../../data'
import { parseLog } from '../../../json/parser'
import type { JsonEntry } from '../../../json/format'

/**
 * Normalize the given object as an R comment.
 * This requires you to check the corresponding name beforehand.
 *
 * @param data  - The data used by the parser (see {@link ParserData})
 * @param entry - The json entry to extract the meta-information from
 */
export function normalizeComment(data: ParserData, obj: JsonEntry): RComment {
	parseLog.debug('[comment]')
	obj = executeHook(data.hooks.other.onComment.before, data, obj)

	const { location, content } = retrieveMetaStructure(obj)
	guard(content.startsWith('#'), 'comment must start with #')

	const result: RComment = {
		type:    RType.Comment,
		location,
		content: content.slice(1),
		lexeme:  content,
		info:    {
			fullRange:        data.currentRange,
			additionalTokens: [],
			fullLexeme:       content
		}
	}
	return executeHook(data.hooks.other.onComment.after, data, result)
}
