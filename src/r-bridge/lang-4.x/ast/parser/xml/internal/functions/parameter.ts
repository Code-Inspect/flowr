import type { NamedXmlBasedJson } from '../../input-format'
import { retrieveMetaStructure } from '../meta'
import type { RNode, RParameter } from '../../../../model'
import { RType, RawRType } from '../../../../model'
import type { ParserData } from '../../data'
import { executeHook, executeUnknownHook } from '../../hooks'
import { log } from '../../../../../../../util/log'
import { guard } from '../../../../../../../util/assert'
import { tryNormalizeSingleNode } from '../structure'
import type { RDelimiter } from '../../../../model/nodes/info'
import { parseLog } from '../../../json/parser'

/**
 * Either parses `[SYMBOL_FORMALS]` or `[SYMBOL_FORMALS, EQ_FORMALS, expr]` as a parameter of a function definition in R.
 * Probably directly called by the function definition parser as otherwise, we do not expect to find parameters.
 *
 * @param data - The data used by the parser (see {@link ParserData})
 * @param objs - Either `[SYMBOL_FORMALS]` or `[SYMBOL_FORMALS, EQ_FORMALS, expr]`
 *
 * @returns The parsed parameter or `undefined` if the given object is not a parameter.
 */
export function tryNormalizeParameter(data: ParserData, objs: NamedXmlBasedJson[]): RParameter | undefined {
	parseLog.debug('[parameter]')
	objs = executeHook(data.hooks.functions.onParameter.before, data, objs)

	if(objs.length !== 1 && objs.length !== 3) {
		log.warn(`Either [SYMBOL_FORMALS] or [SYMBOL_FORMALS, EQ_FORMALS, expr], but got: ${JSON.stringify(objs)}`)
		return executeUnknownHook(data.hooks.functions.onParameter.unknown, data, objs)
	}


	const symbol = objs[0]
	if(symbol.name !== RawRType.SymbolFormals) {
		log.warn(`expected symbol for parameter, yet received ${JSON.stringify(objs)}`)
		return executeUnknownHook(data.hooks.functions.onParameter.unknown, data, objs)
	}

	const defaultValue: RNode | RDelimiter | undefined = objs.length === 3 ? parseWithDefaultValue(data, objs) : undefined

	const { location, content } = retrieveMetaStructure(symbol.content)

	const result: RParameter = {
		type:    RType.Parameter,
		location,
		special: content === '...',
		lexeme:  content,
		name:    {
			type:      RType.Symbol,
			location, content,
			namespace: undefined,
			lexeme:    content,
			info:      {
				fullRange:        location,
				additionalTokens: [],
				fullLexeme:       content
			}
		},
		defaultValue: defaultValue?.type === RType.Delimiter ? undefined : defaultValue,
		info:         {
			fullRange:        location,
			fullLexeme:       content,
			additionalTokens: defaultValue?.type === RType.Delimiter ? [defaultValue] : []
		}
	}

	return executeHook(data.hooks.functions.onParameter.after, data, result)
}

function parseWithDefaultValue(data: ParserData, objs: NamedXmlBasedJson[]): RNode | RDelimiter {
	guard(objs[1].name === RawRType.EqualFormals, () => `[arg-default] second element of parameter must be ${RawRType.EqualFormals}, but: ${JSON.stringify(objs)}`)
	guard(objs[2].name === RawRType.Expression, () => `[arg-default] third element of parameter must be an Expression but: ${JSON.stringify(objs)}`)
	return tryNormalizeSingleNode(data, objs[2])
}
