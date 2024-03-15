import type { NormalizerData } from '../../normalizer-data'
import type { NamedXmlBasedJson } from '../../input-format'
import type { RFunctionDefinition, RParameter } from '../../../../model'
import { RType , RawRType } from '../../../../model'
import { parseLog } from '../../../json/parser'
import { ensureExpressionList, retrieveMetaStructure } from '../../normalize-meta'
import { guard, isNotUndefined } from '../../../../../../../util/assert'
import { splitArrayOn } from '../../../../../../../util/arrays'
import { tryNormalizeParameter } from './normalize-parameter'
import { normalizeExpressions } from '../structure'

/**
 * Tries to parse the given data as a function definition.
 *
 * @param data - The data used by the parser (see {@link NormalizerData})
 * @param mappedWithName - The json object to extract the meta-information from
 *
 * @returns The parsed {@link RFunctionDefinition} or `undefined` if the given construct is not a function definition
 */
export function tryNormalizeFunctionDefinition(data: NormalizerData, mappedWithName: readonly NamedXmlBasedJson[]): RFunctionDefinition | undefined {
	const fnBase = mappedWithName[0]
	if(fnBase.name !== RawRType.Function && fnBase.name !== RawRType.Lambda) {
		parseLog.trace(`expected function definition to be identified by keyword, yet received ${fnBase.name}`)
		return undefined
	}

	const { content, location } = retrieveMetaStructure(fnBase.content)

	const openParen = mappedWithName[1]
	guard(openParen.name === RawRType.ParenLeft, () => `expected opening parenthesis, yet received ${openParen.name}`)

	const closingParenIndex = mappedWithName.findIndex(x => x.name === RawRType.ParenRight)
	guard(closingParenIndex !== -1, () => `expected closing parenthesis, yet received ${JSON.stringify(mappedWithName)}`)

	const splitParameters = splitArrayOn(mappedWithName.slice(2, closingParenIndex), x => x.name === RawRType.Comma)

	parseLog.trace(`function definition has ${splitParameters.length} parameters (by comma split)`)

	const parameters: (undefined | RParameter)[] = splitParameters.map(x => tryNormalizeParameter(data, x))

	if(parameters.some(p => p === undefined)) {
		parseLog.error(`function had unexpected unknown parameters: ${JSON.stringify(parameters.filter(isNotUndefined))}, aborting.`)
		return undefined
	}

	parseLog.trace(`function definition retained ${parameters.length} parameters after parsing, moving to body.`)

	const bodyStructure = mappedWithName.slice(closingParenIndex + 1)
	guard(bodyStructure.length === 1, () => `expected function body to be unique, yet received ${bodyStructure.length}`)

	const body = normalizeExpressions(data, bodyStructure)
	guard(body.length === 1 && body[0].type !== RType.Delimiter, () => `expected function body to yield one normalized expression, but ${body.length}`)


	return {
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
}
