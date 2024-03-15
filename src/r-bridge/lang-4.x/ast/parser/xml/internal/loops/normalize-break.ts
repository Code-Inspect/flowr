import type { NormalizerData } from '../../normalizer-data'
import type { XmlBasedJson } from '../../input-format'
import type { RBreak } from '../../../../model'
import { RType } from '../../../../model'
import { parseLog } from '../../../json/parser'
import { expensiveTrace } from '../../../../../../../util/log'
import { retrieveMetaStructure } from '../../normalize-meta'


export function normalizeBreak(data: NormalizerData, obj: XmlBasedJson): RBreak {
	expensiveTrace(parseLog, () => `[break] ${JSON.stringify(obj)}`)

	const { location, content } = retrieveMetaStructure(obj)

	return {
		type:   RType.Break,
		location,
		lexeme: content,
		info:   {
			fullRange:        location,
			additionalTokens: [],
			fullLexeme:       content
		}
	}
}
