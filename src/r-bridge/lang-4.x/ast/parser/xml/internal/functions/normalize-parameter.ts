import type { NormalizerData } from '../../normalizer-data'
import type { NamedXmlBasedJson } from '../../input-format'
import { parseLog } from '../../../json/parser'
import { retrieveMetaStructure } from '../../normalize-meta'
import { guard } from '../../../../../../../util/assert'
import type { RParameter } from '../../../../model/nodes/r-parameter'
import { RawRType, RType } from '../../../../model/type'
import type { RNode } from '../../../../model/model'
import type { RDelimiter } from '../../../../model/nodes/info/r-delimiter'
import { normalizeSingleNode } from '../structure/normalize-single-node'

/**
 * Either parses `[SYMBOL_FORMALS]` or `[SYMBOL_FORMALS, EQ_FORMALS, expr]` as a parameter of a function definition in R.
 * Probably directly called by the function definition parser as otherwise, we do not expect to find parameters.
 *
 * @param data - The data used by the parser (see {@link NormalizerData})
 * @param objs - Either `[SYMBOL_FORMALS]` or `[SYMBOL_FORMALS, EQ_FORMALS, expr]`
 *
 * @returns The parsed parameter or `undefined` if the given object is not a parameter.
 */
export function tryNormalizeParameter(data: NormalizerData, objs: readonly NamedXmlBasedJson[]): RParameter | undefined {
	parseLog.debug('[parameter]')

	if(objs.length !== 1 && objs.length !== 3) {
		parseLog.warn(`Either [SYMBOL_FORMALS] or [SYMBOL_FORMALS, EQ_FORMALS, expr], but got: ${JSON.stringify(objs)}`)
		return undefined
	}


	const symbol = objs[0]
	if(symbol.name !== RawRType.SymbolFormals) {
		parseLog.warn(`expected symbol for parameter, yet received ${JSON.stringify(objs)}`)
		return undefined
	}

	const defaultValue: RNode | RDelimiter | undefined = objs.length === 3 ? parseWithDefaultValue(data, objs) : undefined

	const { location, content } = retrieveMetaStructure(symbol.content)

	return {
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
}

function parseWithDefaultValue(data: NormalizerData, objs: readonly NamedXmlBasedJson[]): RNode | RDelimiter {
	guard(objs[1].name === RawRType.EqualFormals, () => `[arg-default] second element of parameter must be ${RawRType.EqualFormals}, but: ${JSON.stringify(objs)}`)
	guard(objs[2].name === RawRType.Expression, () => `[arg-default] third element of parameter must be an Expression but: ${JSON.stringify(objs)}`)
	return normalizeSingleNode(data, objs[2])
}
