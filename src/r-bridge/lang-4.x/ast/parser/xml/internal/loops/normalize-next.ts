import type { NormalizerData } from '../../normalizer-data'
import type { RNext } from '../../../../model'
import { RType } from '../../../../model'
import type { XmlBasedJson } from '../../input-format'
import { expensiveTrace } from '../../../../../../../util/log'
import { parseLog } from '../../../json/parser'
import { retrieveMetaStructure } from '../../normalize-meta'

export function normalizeNext(data: NormalizerData, obj: XmlBasedJson): RNext {
	expensiveTrace(parseLog, () => `[next] ${JSON.stringify(obj)}`)

	const { location, content } = retrieveMetaStructure(obj)

	return {
		type:   RType.Next,
		location,
		lexeme: content,
		info:   {
			fullRange:        data.currentRange,
			additionalTokens: [],
			fullLexeme:       data.currentLexeme
		}
	}
}
