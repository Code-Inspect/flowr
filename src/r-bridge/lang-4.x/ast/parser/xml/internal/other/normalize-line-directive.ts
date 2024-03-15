import type { NormalizerData } from '../../normalizer-data'
import type { XmlBasedJson } from '../../input-format'
import type { RComment, RLineDirective } from '../../../../model'
import { RType } from '../../../../model'
import { parseLog } from '../../../json/parser'
import { retrieveMetaStructure } from '../../normalize-meta'
import { guard } from '../../../../../../../util/assert'


const LineDirectiveRegex = /^#line\s+(\d+)\s+"([^"]+)"\s*$/

/**
 * Normalize the given object as an R line directive (`#line <number> "<file>"`).
 * This requires you to check the corresponding name beforehand.
 * If the given object turns out to be no line directive, this returns a normal comment instead.
 *
 * @param data - The data used by the parser (see {@link NormalizerData})
 * @param obj  - The json object to extract the meta-information from
 */
export function normalizeLineDirective(data: NormalizerData, obj: XmlBasedJson): RLineDirective | RComment {
	const { location, content } = retrieveMetaStructure(obj)
	guard(content.startsWith('#line'), 'line directive must start with #line')
	const match = LineDirectiveRegex.exec(content)
	if(match === null) {
		parseLog.debug(`[line-directive] does not match the regex ${LineDirectiveRegex.source} given ${JSON.stringify(content)}`)
		return {
			type:   RType.Comment,
			location,
			lexeme: content,
			info:   {
				fullRange:        data.currentRange,
				additionalTokens: [],
				fullLexeme:       content
			},
			content: content.slice(1)
		}
	} else {
		return {
			type:   RType.LineDirective,
			location,
			line:   parseInt(match[1]),
			file:   match[2],
			lexeme: content,
			info:   {
				fullRange:        data.currentRange,
				additionalTokens: [],
				fullLexeme:       content
			}
		}
	}
}
