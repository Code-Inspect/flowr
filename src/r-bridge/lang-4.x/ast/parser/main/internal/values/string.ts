import type { JsonEntry } from '../../../json/format'
import { retrieveMetaStructure } from '../meta'
import { string2ts } from '../../../../../values'
import type { RString } from '../../../../model'
import { RType } from '../../../../model'
import { executeHook } from '../../hooks'
import type { ParserData } from '../../data'
import { guard } from '../../../../../../../util/assert'
import { parseLog } from '../../../json/parser'

/**
 * Normalize the given entry as a R string (see {@link string2ts}).
 * This requires you to check the corresponding name beforehand.
 *
 * @param data  - The data used by the parser (see {@link ParserData})
 * @param entry  - The entry to extract the meta-information from
 */
export function normalizeString(data: ParserData, entry: JsonEntry): RString {
	parseLog.debug('[string]')
	entry = executeHook(data.hooks.values.onString.before, data, entry)

	const { location, content } = retrieveMetaStructure(entry)

	// based on https://www.rdocumentation.org/packages/utils/versions/3.6.2/topics/getParseData we do not get strings with 1000 characters or more within the text field.
	// therefore, we recover the full string from the surrounding expr lexeme field
	let stringContent = content
	if(stringContent.startsWith('[')) { // something like "[9999 chars quoted with '"']"
		guard(data.currentLexeme !== undefined, 'need current lexeme wrapper for too long strings as they are not stored by the R parser post-processor')
		stringContent = data.currentLexeme
	}

	const result: RString = {
		type:    RType.String,
		location,
		content: string2ts(stringContent),
		lexeme:  stringContent,
		info:    {
			fullRange:        data.currentRange,
			additionalTokens: [],
			fullLexeme:       data.currentLexeme
		}
	}
	return executeHook(data.hooks.values.onString.after, data, result)
}
