import type { NormalizerData } from '../../normalizer-data'
import type { NamedXmlBasedJson, XmlBasedJson } from '../../input-format'
import { XmlParseError, childrenKey, getKeyGuarded } from '../../input-format'
import { RType, RawRType } from '../../../../model'
import type { RComment, RForLoop, RNode, RSymbol } from '../../../../model'
import { parseLog } from '../../../json/parser'
import { normalizeExpressions, splitComments, normalizeSingleNode } from '../structure'
import { ensureExpressionList, getTokenType, retrieveMetaStructure } from '../../normalize-meta'
import { guard } from '../../../../../../../util/assert'
import { tryNormalizeSymbol } from '../values'
import { normalizeComment } from '../other'


export function tryNormalizeFor(
	data: NormalizerData,
	[forToken, head, body]: [NamedXmlBasedJson, NamedXmlBasedJson, NamedXmlBasedJson]
): RForLoop | undefined {
	// funny, for does not use top-level parenthesis
	if(forToken.name !== RawRType.For) {
		parseLog.debug('encountered non-for token for supposed for-loop structure')
		return undefined
	} else if(head.name !== RawRType.ForCondition) {
		throw new XmlParseError(`expected condition for for-loop but found ${JSON.stringify(head)}`)
	} else if(body.name !== RawRType.Expression && body.name !== RawRType.ExprOfAssignOrHelp) {
		throw new XmlParseError(`expected expr body for for-loop but found ${JSON.stringify(body)}`)
	}

	parseLog.debug('trying to parse for-loop')

	const newParseData = { ...data, data, currentRange: undefined, currentLexeme: undefined }

	const { variable: parsedVariable, vector: parsedVector, comments } =
    normalizeForHead(newParseData, head.content)
	const parseBody = normalizeSingleNode(newParseData, body)

	if(
		parsedVariable === undefined ||
    parsedVector === undefined ||
    parseBody.type === RType.Delimiter
	) {
		throw new XmlParseError(
			`unexpected under-sided for-loop, received ${JSON.stringify([
				parsedVariable,
				parsedVariable,
				parseBody,
			])}`
		)
	}

	const { location, content } = retrieveMetaStructure(forToken.content)

	return {
		type:     RType.ForLoop,
		variable: parsedVariable,
		vector:   parsedVector,
		body:     ensureExpressionList(parseBody),
		lexeme:   content,
		info:     {
			fullRange:        data.currentRange,
			additionalTokens: comments,
			fullLexeme:       data.currentLexeme,
		},
		location
	}
}

function normalizeForHead(data: NormalizerData, forCondition: XmlBasedJson): { variable: RSymbol | undefined, vector: RNode | undefined, comments: RComment[] } {
	// must have a child which is `in`, a variable on the left, and a vector on the right
	const children: NamedXmlBasedJson[] = getKeyGuarded<XmlBasedJson[]>(forCondition, childrenKey).map(content => ({ name: getTokenType(content), content }))
	const { comments, others } = splitComments(children)

	const inPosition = others.findIndex(elem => elem.name === RawRType.ForIn)
	guard(inPosition > 0 && inPosition < others.length - 1, () => `for loop searched in and found at ${inPosition}, but this is not in legal bounds for ${JSON.stringify(children)}`)
	const variable = tryNormalizeSymbol(data, [others[inPosition - 1]])
	guard(variable !== undefined, () => `for loop variable should have been parsed to a symbol but was ${JSON.stringify(variable)}`)
	guard((variable as RNode).type === RType.Symbol, () => `for loop variable should have been parsed to a symbol but was ${JSON.stringify(variable)}`)

	const vector = normalizeExpressions(data, [others[inPosition + 1]])
	guard(vector.length === 1 && vector[0].type !== RType.Delimiter, () => `for loop vector should have been parsed to a single element but was ${JSON.stringify(vector)}`)
	const parsedComments = comments.map(c => normalizeComment(data, c.content))

	return { variable, vector: vector[0], comments: parsedComments }
}
