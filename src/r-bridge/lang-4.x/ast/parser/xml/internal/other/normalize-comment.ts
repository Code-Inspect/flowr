import type { NormalizerData } from '../../normalizer-data'
import type { XmlBasedJson } from '../../input-format'
import type { RComment } from '../../../../model'
import { RType } from '../../../../model'
import { retrieveMetaStructure } from '../../normalize-meta'
import { guard } from '../../../../../../../util/assert'

/**
 * Normalize the given object as an R comment.
 * This requires you to check the corresponding name beforehand.
 *
 * @param data - The data used by the parser (see {@link NormalizerData})
 * @param obj  - The json object to extract the meta-information from
 */
export function normalizeComment(data: NormalizerData, obj: XmlBasedJson): RComment {
	const { location, content } = retrieveMetaStructure(obj)
	guard(content.startsWith('#'), 'comment must start with #')

	return {
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
}
