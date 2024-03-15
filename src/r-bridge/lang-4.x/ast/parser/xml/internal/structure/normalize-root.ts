import type { NormalizerData } from '../../normalizer-data'
import type { XmlBasedJson } from '../../input-format'
import { childrenKey, getKeyGuarded } from '../../input-format'
import type { RExpressionList, RNode } from '../../../../model'
import { RawRType, RType } from '../../../../model'
import { assureTokenType } from '../../normalize-meta'
import type { RDelimiter } from '../../../../model/nodes/info'
import { normalizeExpressions } from './normalize-expressions'
import { log } from '../../../../../../../util/log'
import { partition } from '../../../../../../../util/arrays'


export function normalizeRootObjToAst(
	data: NormalizerData,
	obj: XmlBasedJson
): RExpressionList {
	const exprContent = getKeyGuarded<XmlBasedJson>(obj, RawRType.ExpressionList)
	assureTokenType(exprContent, RawRType.ExpressionList)

	let parsedChildren: (RNode | RDelimiter)[] = []

	if(childrenKey in exprContent) {
		const children = getKeyGuarded<XmlBasedJson[]>(exprContent, childrenKey)

		parsedChildren = normalizeExpressions(data, children)
	} else {
		log.debug('no children found, assume empty input')
	}

	const [delimiters, nodes] = partition(parsedChildren, x => x.type === RType.Delimiter)

	return {
		type:     RType.ExpressionList,
		children: nodes as RNode[],
		grouping: undefined,
		lexeme:   undefined,
		info:     {
			fullRange:        data.currentRange,
			additionalTokens: delimiters,
			fullLexeme:       data.currentLexeme
		}
	}
}
