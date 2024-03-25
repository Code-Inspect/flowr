import type { NamedXmlBasedJson, XmlBasedJson } from '../../input-format'
import { childrenKey , getKeysGuarded, XmlParseError } from '../../input-format'

import { ensureExpressionList, getTokenType, retrieveMetaStructure } from '../meta'
import { guard } from '../../../../../../../util/assert'
import type { ParserData } from '../../data'
import { tryNormalizeSymbol } from '../values'
import { normalizeBasedOnType, splitComments, tryNormalizeSingleNode } from '../structure'
import type { RDelimiter } from '../../../../model/nodes/info'
import type { RForLoop, RNode, RSymbol } from '../../../../model'
import { RawRType, RType } from '../../../../model'
import { executeHook, executeUnknownHook } from '../../hooks'
import { normalizeComment } from '../other'
import { parseLog } from '../../../json/parser'

export function tryNormalizeFor(
	data: ParserData,
	forToken: NamedXmlBasedJson,
	head: NamedXmlBasedJson,
	body: NamedXmlBasedJson
): RForLoop | undefined {
	// funny, for does not use top-level parenthesis
	if(forToken.name !== RawRType.For) {
		parseLog.debug('encountered non-for token for supposed for-loop structure')
		return executeUnknownHook(data.hooks.loops.onForLoop.unknown, data, { forToken, condition: head, body })
	} else if(head.name !== RawRType.ForCondition) {
		throw new XmlParseError(`expected condition for for-loop but found ${JSON.stringify(head)}`)
	} else if(body.name !== RawRType.Expression && body.name !== RawRType.ExprOfAssignOrHelp) {
		throw new XmlParseError(`expected expr body for for-loop but found ${JSON.stringify(body)}`)
	}

	parseLog.debug('trying to parse for-loop')

	const newParseData = { ...data, data, currentRange: undefined, currentLexeme: undefined };

	({ forToken, condition: head, body } = executeHook(data.hooks.loops.onForLoop.before, data, { forToken, condition: head, body }))

	const { variable: parsedVariable, vector: parsedVector, additionalTokens: comments } =
    normalizeForHead(newParseData, head.content)
	const parseBody = tryNormalizeSingleNode(newParseData, body)

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

	const result: RForLoop = {
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
	return executeHook(data.hooks.loops.onForLoop.after, data, result)
}

function normalizeForHead(data: ParserData, forCondition: XmlBasedJson): { variable: RSymbol | undefined, vector: RNode | undefined, additionalTokens: (RNode | RDelimiter)[] } {
	// must have a child which is `in`, a variable on the left, and a vector on the right
	const children: NamedXmlBasedJson[] = getKeysGuarded<XmlBasedJson[]>(forCondition, childrenKey).map(content => ({ name: getTokenType(content), content }))
	const { comments, others } = splitComments(children)

	const inPosition = others.findIndex(elem => elem.name === RawRType.ForIn)
	guard(inPosition > 0 && inPosition < others.length - 1, () => `for loop searched in and found at ${inPosition}, but this is not in legal bounds for ${JSON.stringify(children)}`)
	const variable = tryNormalizeSymbol(data, [others[inPosition - 1]])
	guard(variable !== undefined, () => `for loop variable should have been parsed to a symbol but was ${JSON.stringify(variable)}`)
	guard((variable as RNode).type === RType.Symbol, () => `for loop variable should have been parsed to a symbol but was ${JSON.stringify(variable)}`)

	const vector = normalizeBasedOnType(data, [others[inPosition + 1]])
	guard(vector.length === 1 && vector[0].type !== RType.Delimiter, () => `for loop vector should have been parsed to a single element but was ${JSON.stringify(vector)}`)
	const parsedComments: (RNode | RDelimiter)[] = comments.map(c => normalizeComment(data, c.content))
	parsedComments.push(...normalizeBasedOnType(data, others.filter(token => token.name === RawRType.ForIn || token.name === RawRType.ParenLeft || token.name === RawRType.ParenRight))) // e.g., push '('

	return { variable, vector: vector[0], additionalTokens: parsedComments }
}
