import type { MergeableRecord } from '../../../../../util/objects'
import type { DeepReadonly } from 'ts-essentials'
import type { ParserHooks } from './hooks'
import type { SourceRange } from '../../../../../util/range'

/**
 * Contains all information populated and present during parsing and normalization of the R AST.
 */
export interface ParserData extends MergeableRecord {
	/** @see ParserHooks */
	readonly hooks: DeepReadonly<ParserHooks>
	/**
   * The currently active source range during parsing, i.e. the full range of the current element.
   */
	currentRange:   SourceRange | undefined
	/**
   * The currently active lexeme during parsing, i.e. the full lexeme of the current element.
   */
	currentLexeme:  string | undefined
}

/**
 * Thrown if the given input is not valid/contains unexpected elements.
 */
export class ParseError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'ParseError'
	}
}