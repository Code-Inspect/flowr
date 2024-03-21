import type { ParserData } from '../../data'
import type { NamedXmlBasedJson } from '../../input-format'
import type { RFunctionDefinition, RParameter } from '../../../../model'
import { RawRType, RType } from '../../../../model'
import { executeHook, executeUnknownHook } from '../../hooks'
import { ensureExpressionList, retrieveMetaStructure } from '../meta'
import { guard, isNotUndefined } from '../../../../../../../util/assert'
import { splitArrayOn } from '../../../../../../../util/arrays'
import { normalizeBasedOnType } from '../structure'
import { tryNormalizeParameter } from './parameter'
import { log } from '../../../../../../../util/log'
import { parseLog } from '../../../json/parser'

/**
 * Tries to parse the given data as a function definition.
 *
 * @param data - The data used by the parser (see {@link ParserData})
 * @param mappedWithName - The json object to extract the meta-information from
 *
 * @returns The parsed {@link RFunctionDefinition} or `undefined` if the given construct is not a function definition
 */
export function tryNormalizeFunctionDefinition(data: ParserData, mappedWithName: NamedXmlBasedJson[]): RFunctionDefinition | undefined {
	const fnBase = mappedWithName[0]
	if(fnBase.name !== RawRType.Function && fnBase.name !== RawRType.Lambda) {
		parseLog.trace(`expected function definition to be identified by keyword, yet received ${fnBase.name}`)
		return executeUnknownHook(data.hooks.functions.onFunctionDefinition.unknown, data, mappedWithName)
	}

	parseLog.trace('trying to parse function definition')
	mappedWithName = executeHook(data.hooks.functions.onFunctionDefinition.before, data, mappedWithName)

	const { content, location } = retrieveMetaStructure(fnBase.content)

	const openParen = mappedWithName[1]
	guard(openParen.name === RawRType.ParenLeft, () => `expected opening parenthesis, yet received ${openParen.name}`)

	const closingParenIndex = mappedWithName.findIndex(x => x.name === RawRType.ParenRight)
	guard(closingParenIndex !== -1, () => `expected closing parenthesis, yet received ${JSON.stringify(mappedWithName)}`)

	const splitParameters = splitArrayOn(mappedWithName.slice(2, closingParenIndex), x => x.name === RawRType.Comma)

	parseLog.trace(`function definition has ${splitParameters.length} parameters (by comma split)`)

	const parameters: (undefined | RParameter)[] = splitParameters.map(x => tryNormalizeParameter(data, x))

	if(parameters.some(p => p === undefined)) {
		log.error(`function had unexpected unknown parameters: ${JSON.stringify(parameters.filter(isNotUndefined))}, aborting.`)
		return executeUnknownHook(data.hooks.functions.onFunctionDefinition.unknown, data, mappedWithName)
	}

	parseLog.trace(`function definition retained ${parameters.length} parameters after parsing, moving to body.`)

	const bodyStructure = mappedWithName.slice(closingParenIndex + 1)
	guard(bodyStructure.length === 1, () => `expected function body to be unique, yet received ${bodyStructure.length}`)

	const body = normalizeBasedOnType(data, bodyStructure)
	guard(body.length === 1 && body[0].type !== RType.Delimiter, () => `expected function body to yield one normalized expression, but ${body.length}`)


	const result: RFunctionDefinition = {
		type:       RType.FunctionDefinition,
		location,
		lexeme:     content,
		parameters: parameters as RParameter[],
		body:       ensureExpressionList(body[0]),
		info:       {
			fullRange:        data.currentRange,
			additionalTokens: [],
			fullLexeme:       data.currentLexeme
		}
	}
	return executeHook(data.hooks.functions.onFunctionDefinition.after, data, result)
}
