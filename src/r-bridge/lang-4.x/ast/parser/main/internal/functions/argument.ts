import { retrieveMetaStructure } from '../meta'
import type { RNode, RSymbol, RArgument } from '../../../../model'
import { RType, RawRType } from '../../../../model'
import type { ParserData } from '../../data'
import { executeHook, executeUnknownHook } from '../../hooks'
import { log } from '../../../../../../../util/log'
import { guard } from '../../../../../../../util/assert'
import { tryNormalizeSingleNode } from '../structure'
import type { RDelimiter } from '../../../../model/nodes/info'
import { parseLog } from '../../../json/parser'
import type { NamedJsonEntry } from '../../../json/format'

/**
 * Either parses `[expr]` or `[SYMBOL_SUB, EQ_SUB, expr]` as an argument of a function call in R.
 * Probably directly called by the function call parser as otherwise, we do not expect to find arguments.
 *
 * @param data    - The data used by the parser (see {@link ParserData})
 * @param entries - Either `[expr]` or `[SYMBOL_FORMALS, EQ_FORMALS, expr]`
 *
 * @returns The parsed argument or `undefined` if the given object is not an argument.
 */
export function tryToNormalizeArgument(data: ParserData, entries: NamedJsonEntry[]): RArgument | undefined {
	parseLog.debug('[argument]')
	entries = executeHook(data.hooks.functions.onArgument.before, data, entries)

	if(entries.length < 1 || entries.length > 3) {
		log.warn(`Either [expr|value], [SYMBOL_SUB, EQ_SUB], or [SYMBOL_SUB, EQ_SUB, expr], but got: ${entries.map(o => o.name).join(', ')}`)
		return executeUnknownHook(data.hooks.functions.onArgument.unknown, data, entries)
	}


	const symbolOrExpr = entries[0]
	const { location, content } = retrieveMetaStructure(symbolOrExpr.content)

	let parsedValue: RNode | RDelimiter | undefined |  null
	let name: RSymbol | undefined
	if(symbolOrExpr.name === RawRType.Expression) {
		name = undefined
		parsedValue = tryNormalizeSingleNode(data, symbolOrExpr)
	} else if(symbolOrExpr.name === RawRType.SymbolSub || symbolOrExpr.name === RawRType.StringConst) {
		name =    {
			type:      RType.Symbol,
			location,
			content:   symbolOrExpr.name === RawRType.StringConst ? content.slice(1,-1) : content,
			namespace: undefined,
			lexeme:    content,
			info:      {
				fullRange:        location,
				additionalTokens: [],
				fullLexeme:       content
			}
		}
		parsedValue = parseWithValue(data, entries)
	} else {
		log.warn(`expected symbol or expr for argument, yet received ${entries.map(o => o.name).join(',')}`)
		return executeUnknownHook(data.hooks.functions.onArgument.unknown, data, entries)
	}

	guard(parsedValue !== undefined && parsedValue?.type !== RType.Delimiter, () => `[argument] parsed value must not be undefined, yet: ${JSON.stringify(entries)}`)

	const result: RArgument = {
		type:   RType.Argument,
		location,
		lexeme: content,
		name,
		value:  parsedValue ?? undefined,
		info:   {
			fullRange:        location,
			fullLexeme:       content,
			additionalTokens: []
		}
	}

	return executeHook(data.hooks.functions.onArgument.after, data, result)
}

function parseWithValue(data: ParserData, objs: NamedJsonEntry[]): RNode | RDelimiter | undefined | null{
	guard(objs[1].name === RawRType.EqualSub, () => `[arg-default] second element of parameter must be ${RawRType.EqualFormals}, but: ${JSON.stringify(objs)}`)
	guard(objs.length === 2 || objs[2].name === RawRType.Expression, () => `[arg-default] third element of parameter must be an Expression or undefined (for 'x=') but: ${JSON.stringify(objs)}`)
	return objs[2] ? tryNormalizeSingleNode(data, objs[2]) : null
}
