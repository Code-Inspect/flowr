import type { NormalizerData } from '../../normalizer-data'
import type { XmlBasedJson } from '../../input-format'
import { retrieveMetaStructure } from '../../normalize-meta'
import { guard } from '../../../../../../../util/assert'
import { string2ts } from '../../../../../convert-values'
import type { RString } from '../../../../model/nodes/r-string'
import { RType } from '../../../../model/type'

/**
 * Normalize the given object as a R string (see {@link string2ts}).
 * This requires you to check the corresponding name beforehand.
 *
 * @param data - The data used by the parser (see {@link NormalizerData})
 * @param obj  - The json object to extract the meta-information from
 */
export function normalizeString(data: NormalizerData, obj: XmlBasedJson): RString {
	const { location, content } = retrieveMetaStructure(obj)

	// based on https://www.rdocumentation.org/packages/utils/versions/3.6.2/topics/getParseData we do not get strings with 1000 characters or more within the text field.
	// therefore, we recover the full string from the surrounding expr lexeme field
	let stringContent = content
	if(stringContent.startsWith('[')) { // something like "[9999 chars quoted with '"']"
		guard(data.currentLexeme !== undefined, 'need current lexeme wrapper for too long strings as they are not stored by the R parser post-processor')
		stringContent = data.currentLexeme
	}

	return {
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
}
