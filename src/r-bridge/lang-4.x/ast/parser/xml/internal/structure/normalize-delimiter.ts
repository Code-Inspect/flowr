import type { NamedXmlBasedJson } from '../../input-format'
import { retrieveMetaStructure } from '../../normalize-meta'
import { RType, RawRType } from '../../../../model/type'
import type { RDelimiter } from '../../../../model/nodes/info/r-delimiter'

export function normalizeDelimiter(elem: NamedXmlBasedJson): RDelimiter {
	const { location, content } = retrieveMetaStructure(elem.content)
	return {
		type:    RType.Delimiter,
		location,
		lexeme:  content,
		subtype: elem.name as RawRType.BraceLeft | RawRType.BraceRight | RawRType.ParenLeft | RawRType.ParenRight | RawRType.Semicolon
	}
}
