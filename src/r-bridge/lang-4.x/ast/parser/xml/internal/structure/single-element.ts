import type { NamedXmlBasedJson } from '../../input-format'
import { XmlParseError } from '../../input-format'
import { normalizeNumber, normalizeString, tryNormalizeSymbol } from '../values'
import { guard } from '../../../../../../../util/assert'
import type { ParserData } from '../../data'
import { normalizeExpression } from '../expression'
import { getWithTokenType, retrieveMetaStructure } from '../meta'
import type { RNode } from '../../../../model'
import { RawRType, RType } from '../../../../model'
import { normalizeComment } from '../other'
import { normalizeBreak, normalizeNext } from '../loops'
import { normalizeLineDirective } from '../other/line-directive'
import type { RDelimiter, RDelimiterNode } from '../../../../model/nodes/info'

function normalizeDelimiter(data: ParserData, elem: NamedXmlBasedJson): RDelimiter {
	const {
		location,
		content
	} = retrieveMetaStructure(elem.content)
	return {
		type:    RType.Delimiter,
		location,
		lexeme:  content,
		subtype: elem.name as RDelimiterNode
	}
}

/**
 * Parses a single structure in the ast based on its type (e.g., a string, a number, a symbol, ...)
 *
 * @param data - The data used by the parser (see {@link ParserData})
 * @param elem - The element to parse
 *
 * @returns The parsed element as an `RNode` or an `RDelimiter` if it is such.
 */
export function tryNormalizeSingleNode(data: ParserData, elem: NamedXmlBasedJson): RNode | RDelimiter {
	switch(elem.name) {
		case RawRType.ParenLeft:
		case RawRType.ParenRight:
		case RawRType.BraceLeft:
		case RawRType.BraceRight:
		case RawRType.ForIn:
			return normalizeDelimiter(data, elem)
		case RawRType.Comment:
			return normalizeComment(data, elem.content)
		case RawRType.LineDirective:
			return normalizeLineDirective(data, elem.content)
		case RawRType.ExpressionList:
		case RawRType.Expression:
		case RawRType.ExprOfAssignOrHelp:
			return normalizeExpression(data, elem.content)
		case RawRType.NumericConst:
			return normalizeNumber(data, elem.content)
		case RawRType.StringConst:
			return normalizeString(data, elem.content)
		case RawRType.Break:
			return normalizeBreak(data, elem.content)
		case RawRType.Next:
			return normalizeNext(data, elem.content)
		case RawRType.Symbol:
		case RawRType.Slot:
		case RawRType.NullConst: {
			const symbol =  tryNormalizeSymbol(data, getWithTokenType([elem.content]))
			guard(symbol !== undefined, () => `should have been parsed to a symbol but was ${JSON.stringify(symbol)}`)
			return symbol
		}
		default:
			throw new XmlParseError(`unknown type ${elem.name} for ${JSON.stringify(elem)} in ${JSON.stringify(data)}`)
	}
}
