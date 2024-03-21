import type { NamedXmlBasedJson } from '../input-format'
import { retrieveMetaStructure } from './meta'
import type { ParserData } from '../data'
import type { RAccess, RNode, RArgument } from '../../../model'
import { RType, RawRType } from '../../../model'
import { executeHook, executeUnknownHook } from '../hooks'
import { normalizeBasedOnType } from './structure'
import { guard } from '../../../../../../util/assert'
import { splitArrayOn } from '../../../../../../util/arrays'
import { tryToNormalizeArgument } from './functions/argument'
import { parseLog } from '../../json/parser'

/**
 * Tries to normalize the given data as access (e.g., indexing).
 *
 * @param data           - The data used by the parser (see {@link ParserData})
 * @param mappedWithName - The json object to extract the meta-information from
 *
 * @returns The parsed {@link RAccess} or `undefined` if the given construct is not accessing a value
 */
export function tryNormalizeAccess(data: ParserData, mappedWithName: NamedXmlBasedJson[]): RAccess | undefined {
	parseLog.trace('trying to parse access')
	mappedWithName = executeHook(data.hooks.onAccess.before, data, mappedWithName)

	if(mappedWithName.length < 3) {
		parseLog.trace('expected at least three elements are required to parse an access')
		return executeUnknownHook(data.hooks.onAccess.unknown, data, mappedWithName)
	}

	const accessOp = mappedWithName[1]

	let operator: RAccess['operator']
	let closingLength = 0

	switch(accessOp.name) {
		case RawRType.BracketLeft:
			operator = '['
			closingLength = 1
			break
		case RawRType.Dollar:
			operator = '$'
			break
		case RawRType.At:
			operator = '@'
			break
		case RawRType.DoubleBracketLeft:
			operator = '[['
			closingLength = 2
			break
		default:
			parseLog.trace(`expected second element to be an access operator, yet received ${accessOp.name}`)
			return executeUnknownHook(data.hooks.onAccess.unknown, data, mappedWithName)
	}

	const accessed = mappedWithName[0]
	if(accessed.name !== RawRType.Expression && accessed.name !== RawRType.ExprOfAssignOrHelp) {
		parseLog.trace(`expected accessed element to be wrapped an expression, yet received ${accessed.name}`)
		return executeUnknownHook(data.hooks.onAccess.unknown, data, mappedWithName)
	}

	const parsedAccessed = normalizeBasedOnType(data, [accessed])
	if(parsedAccessed.length !== 1) {
		parseLog.trace(`expected accessed element to be wrapped an expression, yet received ${accessed.name}`)
		return executeUnknownHook(data.hooks.onAccess.unknown, data, mappedWithName)
	}

	const remaining = mappedWithName.slice(2, mappedWithName.length - closingLength)

	parseLog.trace(`${remaining.length} remaining arguments for access`)

	const splitAccessOnComma = splitArrayOn(remaining, x => x.name === RawRType.Comma)

	const parsedAccess: (RNode | null)[] = splitAccessOnComma.map(x => {
		if(x.length === 0) {
			parseLog.trace('record empty access')
			return null
		}
		parseLog.trace('trying to parse access')
		const gotAccess = parseAccessArgument(operator, data, x)
		guard(gotAccess !== undefined, () => `expected one access result in access as argument, yet received ${JSON.stringify(gotAccess)} for ${JSON.stringify([operator, x])}`)
		return gotAccess
	})

	let resultingAccess: (RNode | null)[] | string = parsedAccess

	if(operator === '@' || operator === '$') {
		guard(parsedAccess.length === 1, () => `expected one access result in access with ${JSON.stringify(operator)}, yet received ${JSON.stringify(parsedAccess)}`)
		const first = parsedAccess[0]
		guard(first !== null && (first.type === RType.Symbol || first.type === RType.String || first.type === RType.Logical), () => `${JSON.stringify(operator)} requires one symbol, yet received ${JSON.stringify(parsedAccess)}`)
		resultingAccess = first.type === RType.String ? first.content.str : first.lexeme
	}

	const {
		content, location
	} = retrieveMetaStructure(accessOp.content)

	const result = {
		type:     RType.Access,
		location,
		lexeme:   content,
		accessed: parsedAccessed[0],
		operator,
		access:   resultingAccess,
		info:     {
			fullRange:        data.currentRange,
			additionalTokens: [],
			fullLexeme:       data.currentLexeme
		}
	} as RAccess
	return executeHook(data.hooks.onAccess.after, data, result)
}


function parseAccessArgument(operator: RAccess['operator'], data: ParserData, elements: NamedXmlBasedJson[]): RArgument | RNode | undefined {
	// within access the content is *not* wrapped within another expression, that means if we have a SYMBOL_SUB we can directly parse the argument,
	// otherwise we have to add the expression layer
	// console.log('parseAccessArgument', elements.map(x => x.name))
	if(operator === '@' || operator === '$') {
		const parse = normalizeBasedOnType(data, elements)
		return parse.length !== 1 ? undefined : parse[0] as RNode
	} else {
		return tryToNormalizeArgument(data, elements)
	}
}
