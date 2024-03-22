import type { NamedJsonEntry } from '../../../json/format'
import { guard } from '../../../../../../../util/assert'
import { retrieveMetaStructure } from '../meta'
import type { RSymbol } from '../../../../model'
import { isSymbol, RType } from '../../../../model'
import type { ParserData } from '../../data'
import { executeHook, executeUnknownHook } from '../../hooks'
import { startAndEndsWith } from '../../../../../../../util/strings'
import { parseLog } from '../../../json/parser'

/**
 * Normalize the given entries as R symbols (incorporating namespace information).
 *
 * The special symbols `T` and `F` are parsed as logic values.
 *
 * @param data    - The data used by the parser (see {@link ParserData})
 * @param entries - The json entries to extract the meta-information from
 *
 * @returns The parsed symbol (with populated namespace information) or `undefined` if the given object is not a symbol.
 */
export function tryNormalizeSymbol(data: ParserData, entries: NamedJsonEntry[]): RSymbol | undefined {
	guard(entries.length > 0, 'to parse symbols we need at least one object to work on!')
	parseLog.debug('trying to parse symbol')
	entries = executeHook(data.hooks.values.onSymbol.before, data, entries)

	let location, content, namespace

	if(entries.length === 1 && isSymbol(entries[0].name)) {
		const meta  = retrieveMetaStructure(entries[0].content)
		location    = meta.location
		content     = meta.content
		namespace   = undefined
	} else if(entries.length === 3 && isSymbol(entries[2].name)) {
		const meta  = retrieveMetaStructure(entries[2].content)
		location    = meta.location
		content     = meta.content
		namespace   = retrieveMetaStructure(entries[0].content).content
	} else {
		return executeUnknownHook(data.hooks.values.onSymbol.unknown, data, entries)
	}

	const result: RSymbol = {
		type:    RType.Symbol,
		namespace,
		location,
		// remove backticks from symbol
		content: startAndEndsWith(content, '`') ? content.substring(1, content.length - 1) : content,
		lexeme:  content,
		info:    {
			fullRange:        data.currentRange,
			additionalTokens: [],
			fullLexeme:       data.currentLexeme
		}
	}

	return executeHook(data.hooks.values.onSymbol.after, data, result)
}
