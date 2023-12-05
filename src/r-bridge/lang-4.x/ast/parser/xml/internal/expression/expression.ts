import { getKeysGuarded, NamedXmlBasedJson, XmlBasedJson } from '../../input-format'
import { getWithTokenType, retrieveMetaStructure } from '../meta'
import { parseLog } from '../../parser'
import { ParserData } from '../../data'
import { normalizeBasedOnType, splitComments } from '../structure'
import { tryNormalizeFunctionCall, tryNormalizeFunctionDefinition } from '../functions'
import { RType, RNode } from '../../../../model'
import { executeHook } from '../../hooks'
import { tryNormalizeAccess } from '../access'
import { normalizeComment } from '../other'
import { partition } from '../../../../../../../util/arrays'

/**
 * Returns an expression list if there are multiple children, otherwise returns the single child directly with no expr wrapper
 *
 * @param data - The data used by the parser (see {@link ParserData})
 * @param obj  - The json object to extract the meta-information from
 */
export function normalizeExpression(data: ParserData, obj: XmlBasedJson): RNode {
	parseLog.debug('Parsing expr')
	obj = executeHook(data.hooks.expression.onExpression.before, data, obj)

	const {
		unwrappedObj,
		content,
		location
	} = retrieveMetaStructure(data.config, obj)

	const childrenSource = getKeysGuarded<XmlBasedJson[]>(unwrappedObj, data.config.childrenName)
	const typed: NamedXmlBasedJson[] = getWithTokenType(data.config.tokenMap, childrenSource)

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

	let result: RNode
	if(nodes.length === 1) {
		result = nodes[0] as RNode
		result.info.additionalTokens = [...result.info.additionalTokens ?? []]
	} else {
		result = {
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
	return executeHook(data.hooks.expression.onExpression.after, data, result)
}
