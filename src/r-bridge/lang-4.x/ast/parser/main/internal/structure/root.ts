import { assureTokenType } from '../meta'
import { normalizeBasedOnType } from './elements'
import type { ParserData } from '../../data'
import type { RExpressionList, RNode } from '../../../../model'
import { RType, RawRType } from '../../../../model'
import { log } from '../../../../../../../util/log'
import { partition } from '../../../../../../../util/arrays'
import type { RDelimiter } from '../../../../model/nodes/info'
import type { JsonEntry } from '../../../json/format'

export function parseRootObjToAst(
	data: ParserData,
	obj: JsonEntry
): RExpressionList {
	const exprContent = obj.token
	assureTokenType(exprContent, RawRType.ExpressionList)

	let parsedChildren: (RNode | RDelimiter)[] = []

	if(obj.children.length > 0) {
		const children = obj.children
		parsedChildren = normalizeBasedOnType(data, children)
	} else {
		log.debug('no children found, assume empty input')
	}

	const [delimiters, nodes] = partition(parsedChildren, x => x.type === RType.Delimiter)

	return {
		type:     RType.ExpressionList,
		children: nodes as RNode[],
		lexeme:   undefined,
		info:     {
			fullRange:        data.currentRange,
			additionalTokens: delimiters,
			fullLexeme:       data.currentLexeme
		}
	}
}
