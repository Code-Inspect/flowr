import type { DeepPartial } from 'ts-essentials'
import type { XmlBasedJson, XmlParserHooks , ParserData } from '../xml'
import { nameKey , DEFAULT_PARSER_HOOKS , attributesKey, contentKey , childrenKey } from '../xml'
import { decorateAst, deterministicCountingIdGenerator } from '../../model'
import type { IdGenerator, NoInfo , NormalizedAst } from '../../model'
import { deepMergeObject } from '../../../../../util/objects'
import type { Entry } from './format'
import { RootId, prepareParsedData } from './format'
import { parseRootObjToAst } from '../xml/internal'
import { log } from '../../../../../util/log'

export const parseLog = log.getSubLogger({ name: 'ast-parser' })

export function normalize(jsonString: string, hooks?: DeepPartial<XmlParserHooks>, getId: IdGenerator<NoInfo> = deterministicCountingIdGenerator(0)): NormalizedAst {
	const hooksWithDefaults = deepMergeObject(DEFAULT_PARSER_HOOKS, hooks) as XmlParserHooks

	const data: ParserData = { hooks: hooksWithDefaults, currentRange: undefined, currentLexeme: undefined }
	const object = convertPreparedParsedData(prepareParsedData(jsonString))

	return decorateAst(parseRootObjToAst(data, object), getId)
}

export function convertPreparedParsedData(valueMapping: Map<number, Entry>): XmlBasedJson {
	const exprlist: XmlBasedJson =  {}
	exprlist[nameKey] = 'exprlist'
	const children = []
	for(const entry of valueMapping.values()) {
		if(entry.parent == RootId) {
			children.push(convertEntry(entry))
		}
	}
	exprlist[childrenKey] = children
	return { 'exprlist': exprlist }
}

function convertEntry(csvEntry: Entry): XmlBasedJson {
	const xmlEntry: XmlBasedJson = {}

	xmlEntry[attributesKey] = {
		'line1': csvEntry.line1,
		'col1':  csvEntry.col1,
		'line2': csvEntry.line2,
		'col2':  csvEntry.col2
	}
	xmlEntry[nameKey] = csvEntry.token
	if(csvEntry.text) {
		xmlEntry[contentKey] = csvEntry.text
	}

	// check and recursively iterate children
	if(csvEntry.children && csvEntry.children.length > 0){
		xmlEntry[childrenKey] = csvEntry.children
			// we sort children the same way xmlparsedata does (by line, by column, by inverse end line, by inverse end column, by terminal state, by combined "start" tiebreaker value)
			// (https://github.com/r-lib/xmlparsedata/blob/main/R/package.R#L153C72-L153C78)
			.sort((c1,c2) => c1.line1-c2.line1 || c1.col1-c2.col1 || c2.line2-c1.line2 || c2.col2-c1.col2 || Number(c1.terminal)-Number(c2.terminal) || sortTiebreak(c1)-sortTiebreak(c2))
			.map(convertEntry)
	}

	return xmlEntry
}

function sortTiebreak(entry: Entry) {
	// see https://github.com/r-lib/xmlparsedata/blob/main/R/package.R#L110C5-L110C11
	return entry.line1 * (Math.max(entry.col1, entry.col2) + 1) + entry.col1
}
