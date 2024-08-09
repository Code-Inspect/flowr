import { getWithTokenType } from '../../normalize-meta'
import type { NormalizerData } from '../../normalizer-data'
import type { NamedXmlBasedJson } from '../../input-format'
import { XmlParseError } from '../../input-format'
import { normalizeLineDirective } from '../other/normalize-line-directive'
import { guard } from '../../../../../../../util/assert'
import { normalizeDelimiter } from './normalize-delimiter'
import { RawRType } from '../../../../model/type'
import { normalizeComment } from '../other/normalize-comment'
import { normalizeExpression } from '../expression/normalize-expression'
import { normalizeNumber } from '../values/normalize-number'
import { normalizeString } from '../values/normalize-string'
import { normalizeBreak } from '../loops/normalize-break'
import { normalizeNext } from '../loops/normalize-next'
import { tryNormalizeSymbol } from '../values/normalize-symbol'
import type { RNode } from '../../../../model/model'
import type { RDelimiter } from '../../../../model/nodes/info/r-delimiter'

/**
 * Parses a single structure in the ast based on its type (e.g., a string, a number, a symbol, ...)
 *
 * @param data - The data used by the parser (see {@link NormalizerData})
 * @param elem - The element to parse
 *
 * @returns The parsed element as an `RNode` or an `RDelimiter` if it is such.
 */
export function normalizeSingleNode(data: NormalizerData, elem: NamedXmlBasedJson): RNode | RDelimiter {
	switch(elem.name) {
		case RawRType.ParenLeft:
		case RawRType.ParenRight:
		case RawRType.BraceLeft:
		case RawRType.BraceRight:
			return normalizeDelimiter(elem)
		case RawRType.Comment:
			return normalizeComment(data, elem.content)
		case RawRType.LineDirective:
			return normalizeLineDirective(data, elem.content)
		case RawRType.ExpressionList:
		case RawRType.Expression:
		case RawRType.ExprOfAssignOrHelp:
		case RawRType.LegacyEqualAssign:
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
			const symbol = tryNormalizeSymbol(data, getWithTokenType([elem.content]))
			guard(symbol !== undefined, () => `should have been parsed to a symbol but was ${JSON.stringify(symbol)}`)
			return symbol
		}
		default:
			throw new XmlParseError(`unknown type ${elem.name} for ${JSON.stringify(elem)} in ${JSON.stringify(data)}`)
	}
}
