import type { NormalizerData } from '../../normalizer-data'
import type { NamedXmlBasedJson, XmlBasedJson } from '../../input-format'
import { childrenKey, getKeyGuarded } from '../../input-format'
import type { RNode } from '../../../../model'
import { RType } from '../../../../model'
import { parseLog } from '../../../json/parser'
import { getWithTokenType, retrieveMetaStructure } from '../../normalize-meta'
import { normalizeExpressions, splitComments } from '../structure'
import { tryNormalizeFunctionCall, tryNormalizeFunctionDefinition } from '../functions'
import { tryNormalizeAccess } from '../normalize-access'
import { normalizeComment } from '../other'
import { partition } from '../../../../../../../util/arrays'

/**
 * Returns an expression list if there are multiple children, otherwise returns the single child directly with no expr wrapper
 *
 * @param data - The data used by the parser (see {@link NormalizerData})
 * @param obj  - The json object to extract the meta-information from
 */
export function normalizeExpression(data: NormalizerData, obj: XmlBasedJson): RNode {
	parseLog.debug('[expr]')

	const { unwrappedObj, content, location } = retrieveMetaStructure(obj)

	const childrenSource = getKeyGuarded<XmlBasedJson[]>(unwrappedObj, childrenKey)
	const typed: NamedXmlBasedJson[] = getWithTokenType(childrenSource)

	const { others, comments } = splitComments(typed)

	const childData: NormalizerData = { ...data, currentRange: location, currentLexeme: content }

	const maybeFunctionCall = tryNormalizeFunctionCall(childData, others)
	if(maybeFunctionCall !== undefined) {
		maybeFunctionCall.info.additionalTokens = [...maybeFunctionCall.info.additionalTokens ?? [], ...comments.map(x => normalizeComment(data, x.content))]
		return maybeFunctionCall
	}

	const maybeAccess = tryNormalizeAccess(childData, others)
	if(maybeAccess !== undefined) {
		maybeAccess.info.additionalTokens = [...maybeAccess.info.additionalTokens ?? [], ...comments.map(x => normalizeComment(data, x.content))]
		return maybeAccess
	}

	const maybeFunctionDefinition = tryNormalizeFunctionDefinition(childData, others)
	if(maybeFunctionDefinition !== undefined) {
		maybeFunctionDefinition.info.additionalTokens = [...maybeFunctionDefinition.info.additionalTokens ?? [], ...comments.map(x => normalizeComment(data, x.content))]
		return maybeFunctionDefinition
	}


	const children = normalizeExpressions(childData, childrenSource)

	const [delimiters, nodes] = partition(children, x => x.type === RType.Delimiter)

	if(nodes.length === 1) {
		const result = nodes[0] as RNode
		result.info.additionalTokens = [...result.info.additionalTokens ?? [], ...delimiters]
		return result
	} else {
		return {
			type:     RType.ExpressionList,
			grouping: undefined,
			location,
			children: nodes as RNode[],
			lexeme:   content,
			info:     {
				fullRange:        childData.currentRange,
				additionalTokens: delimiters,
				fullLexeme:       childData.currentLexeme
			}
		}
	}
}
