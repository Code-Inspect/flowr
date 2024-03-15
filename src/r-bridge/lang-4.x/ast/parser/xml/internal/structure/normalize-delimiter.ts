import type { NamedXmlBasedJson } from '../../input-format'
import type { RDelimiter } from '../../../../model/nodes/info'
import { retrieveMetaStructure } from '../../normalize-meta'
import { RType } from '../../../../model'

export function normalizeDelimiter(elem: NamedXmlBasedJson): RDelimiter {
	const { location, content } = retrieveMetaStructure(elem.content)
	return {
		type:    RType.Delimiter,
		location,
		lexeme:  content,
		subtype: elem.name
	}
}
