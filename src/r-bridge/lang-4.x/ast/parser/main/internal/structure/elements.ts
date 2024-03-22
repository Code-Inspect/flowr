import { splitArrayOn } from '../../../../../../../util/arrays'
import { getWithTokenType, retrieveMetaStructure } from '../meta'
import type { ParserData } from '../../data'
import { tryNormalizeSingleNode } from './single-element'
import { tryNormalizeSymbol } from '../values'
import { tryNormalizeUnary, tryNormalizeBinary } from '../operators'
import {
	tryNormalizeRepeat,
	tryNormalizeFor,
	tryNormalizeWhile
} from '../loops'
import { tryNormalizeIfThenElse, tryNormalizeIfThen } from '../control'
import type { RNode } from '../../../../model'
import { RType, RawRType } from '../../../../model'
import { log } from '../../../../../../../util/log'
import { normalizeComment } from '../other'
import type { RDelimiter } from '../../../../model/nodes/info'
import { parseLog } from '../../../json/parser'
import type { JsonEntry, NamedJsonEntry } from '../../../json/format'

function normalizeMappedWithoutSemicolonBasedOnType(mappedWithName: NamedJsonEntry[], data: ParserData): (RNode | RDelimiter)[] {
	if(mappedWithName.length === 1) {
		return [tryNormalizeSingleNode(data, mappedWithName[0])]
	} else if(mappedWithName.length === 2) {
		const unaryOp = tryNormalizeUnary(
			data,
			mappedWithName[0],
			mappedWithName[1]
		)
		if(unaryOp !== undefined) {
			return [unaryOp]
		}
		const repeatLoop = tryNormalizeRepeat(
			data,
			mappedWithName[0],
			mappedWithName[1]
		)
		if(repeatLoop !== undefined) {
			return [repeatLoop]
		}
	} else if(mappedWithName.length === 3) {
		const binary = tryNormalizeBinary(
			data,
			mappedWithName[0],
			mappedWithName[1],
			mappedWithName[2]
		)
		if(binary !== undefined) {
			return [binary]
		} else {
			const forLoop = tryNormalizeFor(
				data,
				mappedWithName[0],
				mappedWithName[1],
				mappedWithName[2]
			)
			if(forLoop !== undefined) {
				return [forLoop]
			} else {
				// could be a symbol with namespace information
				const symbol = tryNormalizeSymbol(data, mappedWithName)
				if(symbol !== undefined) {
					return [symbol]
				}
			}
		}
	} else if(mappedWithName.length === 5) {
		const ifThen = tryNormalizeIfThen(data, [
			mappedWithName[0],
			mappedWithName[1],
			mappedWithName[2],
			mappedWithName[3],
			mappedWithName[4]
		])
		if(ifThen !== undefined) {
			return [ifThen]
		} else {
			const whileLoop = tryNormalizeWhile(
				data,
				mappedWithName[0],
				mappedWithName[1],
				mappedWithName[2],
				mappedWithName[3],
				mappedWithName[4]
			)
			if(whileLoop !== undefined) {
				return [whileLoop]
			}
		}
	} else if(mappedWithName.length === 7) {
		const ifThenElse = tryNormalizeIfThenElse(data, [
			mappedWithName[0],
			mappedWithName[1],
			mappedWithName[2],
			mappedWithName[3],
			mappedWithName[4],
			mappedWithName[5],
			mappedWithName[6]
		])
		if(ifThenElse !== undefined) {
			return [ifThenElse]
		}
	}

	// otherwise perform default parsing
	return parseNodesWithUnknownType(data, mappedWithName)
}

export function splitComments(mappedWithName: NamedJsonEntry[]) {
	const comments = []
	const others = []
	for(const elem of mappedWithName) {
		if(elem.name === RawRType.Comment) {
			comments.push(elem)
		} else {
			others.push(elem)
		}
	}
	return { comments, others }
}

export function normalizeBasedOnType(
	data: ParserData,
	entries: JsonEntry[] | NamedJsonEntry[]
): (RNode | RDelimiter)[] {
	if(entries.length === 0) {
		parseLog.warn('no children received, skipping')
		return []
	}

	let mappedWithName: NamedJsonEntry[]

	if(entries[0].name) {
		mappedWithName = entries as NamedJsonEntry[]
	} else {
		mappedWithName = getWithTokenType(entries as JsonEntry[])
	}

	log.trace(`[parseBasedOnType] names: [${mappedWithName.map(({ name }) => name).join(', ')}]`)

	const semiColons: RDelimiter[] = []
	const splitOnSemicolon = splitArrayOn(
		mappedWithName,
		node => {
			const res = node.name === RawRType.Semicolon
			if(res) {
				const { location, content } = retrieveMetaStructure(node.content)
				semiColons.push({
					type:     RType.Delimiter,
					subtype:  RawRType.Semicolon,
					location: location,
					lexeme:  	content
				})
			}
			return res
		}
	)

	if(splitOnSemicolon.length > 1) {
		log.trace(`found ${splitOnSemicolon.length} expressions by semicolon-split, parsing them separately`)
		const flattened = []
		for(const sub of splitOnSemicolon) {
			const result = normalizeBasedOnType(data, sub)
			if(result.length === 1 && result[0].type === RType.ExpressionList) {
				flattened.push(...result[0].children)
			} else {
				flattened.push(...result)
			}
		}
		return [...flattened, ...semiColons]
	}

	/*
   * if splitOnSemicolon.length === 1, we can continue with the normal parsing, but we may have had a trailing semicolon, with this, it is removed as well.
   * splitOnSemicolon.length === 0 is not possible, as we would have had an empty array before, split does not add elements.
   */
	mappedWithName = splitOnSemicolon[0]
	const { comments, others } = splitComments(mappedWithName)

	const parsedComments = comments.map(c => normalizeComment(data, c.content))

	const result = normalizeMappedWithoutSemicolonBasedOnType(others, data)

	// we hoist comments
	return [...parsedComments, ...result]
}

export function parseNodesWithUnknownType(data: ParserData, mappedWithName: NamedJsonEntry[]): (RNode | RDelimiter)[] {
	const parsedNodes: (RNode | RDelimiter)[] = []
	// used to indicate the new root node of this set of nodes
	for(const elem of mappedWithName) {
		const retrieved = tryNormalizeSingleNode(data, elem)
		parsedNodes.push(retrieved)
	}
	return parsedNodes
}
