import type { NamedXmlBasedJson, XmlBasedJson } from '../../../common/input-format'
import { childrenKey, getKeyGuarded } from '../../../common/input-format'
import type { ParserData } from '../../data'
import { normalizeBasedOnType, splitComments } from '../structure'
import { tryNormalizeFunctionCall, tryNormalizeFunctionDefinition } from '../functions'
import { tryNormalizeAccess } from '../access'
import { normalizeComment } from '../other'
import { partition } from '../../../../../../../../util/arrays'
import { getWithTokenType, retrieveMetaStructure } from '../../../common/meta'
import type { RNode } from '../../../../../model'
import { RType } from '../../../../../model'
import { parseLog } from '../../../../json/parser'

/**
 * Returns an expression list if there are multiple children, otherwise returns the single child directly with no expr wrapper
 *
 * @param data - The data used by the parser (see {@link ParserData})
 * @param obj  - The json object to extract the meta-information from
 */
export function normalizeExpression(data: ParserData, obj: XmlBasedJson): RNode {
	parseLog.debug('Parsing expr')

	const {
		unwrappedObj,
		content,
		location
	} = retrieveMetaStructure(obj)

	const childrenSource = getKeyGuarded<XmlBasedJson[]>(unwrappedObj, childrenKey)
	const typed: NamedXmlBasedJson[] = getWithTokenType(childrenSource)

	const { others, comments } = splitComments(typed)

	const childData: ParserData = { ...data, currentRange: location, currentLexeme: content }

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


	const children = normalizeBasedOnType(childData, childrenSource)

	const [delimiters, nodes] = partition(children, x => x.type === RType.Delimiter)

	if(nodes.length === 1) {
		const result = nodes[0] as RNode
		result.info.additionalTokens = [...result.info.additionalTokens ?? [], ...delimiters]
		return result
	} else {
		return {
			type:     RType.ExpressionList,
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
