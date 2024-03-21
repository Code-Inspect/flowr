import type { MergeableRecord } from '../../../../../util/objects'
import type { DeepReadonly } from 'ts-essentials'
import type { XmlParserHooks } from './hooks'
import type { SourceRange } from '../../../../../util/range'

/**
 * Contains all information populated and present during parsing and normalization of the R AST.
 */
export interface ParserData extends MergeableRecord {
	/** @see XmlParserHooks */
	readonly hooks: DeepReadonly<XmlParserHooks>
	/**
   * The currently active source range during parsing, i.e. the full range of the current element.
   */
	currentRange:   SourceRange | undefined
	/**
   * The currently active lexeme during parsing, i.e. the full lexeme of the current element.
   */
	currentLexeme:  string | undefined
}
