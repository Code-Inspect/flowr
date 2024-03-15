import type { MergeableRecord } from '../../../../../util/objects'
import type { SourceRange } from '../../../../../util/range'

/**
 * Contains all information populated and present during parsing and normalization of the R AST.
 */
export interface NormalizerData extends MergeableRecord {
	/**
   * The currently active source range during parsing, i.e. the full range of the current element.
   */
	currentRange:  SourceRange | undefined
	/**
   * The currently active lexeme during parsing, i.e. the full lexeme of the current element.
   */
	currentLexeme: string | undefined
}
