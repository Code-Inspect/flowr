import { childrenKey, nameKey, attributesKey, contentKey } from '../xml'
import type { IdGenerator, NoInfo, NormalizedAst } from '../../model'
import { decorateAst, deterministicCountingIdGenerator, RawRType } from '../../model'
import type { Entry } from './format'
import { prepareParsedData } from './format'
import { log } from '../../../../../util/log'
import type { NormalizerData, XmlBasedJson } from '../xml'
import { normalizeRootObjToAst } from '../xml/internal'

export const parseLog = log.getSubLogger({ name: 'ast-parser' })

export function normalize(jsonString: string, getId: IdGenerator<NoInfo> = deterministicCountingIdGenerator(0)): NormalizedAst {
	const data: NormalizerData = { currentRange: undefined, currentLexeme: undefined }
	const object = convertPreparedParsedData(prepareParsedData(jsonString))

	return decorateAst(normalizeRootObjToAst(data, object), getId)
}

export function convertPreparedParsedData(rootEntries: Entry[]): XmlBasedJson {
	return {
		[RawRType.ExpressionList]: {
			[nameKey]:     RawRType.ExpressionList,
			[childrenKey]: rootEntries.map(convertEntry)
		}
	}
}

function convertEntry(csvEntry: Entry): XmlBasedJson {
	const xmlEntry: XmlBasedJson = {
		[nameKey]:       csvEntry.token,
		[attributesKey]: {
			'line1': csvEntry.line1,
			'col1':  csvEntry.col1,
			'line2': csvEntry.line2,
			'col2':  csvEntry.col2
		}
	}

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
