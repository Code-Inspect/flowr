import { RawRType, RType } from '../../type'
import { Location } from '../../model'
import { MergeableRecord } from '../../../../../../util/objects'

export type RDelimiterNode = RawRType.BraceLeft | RawRType.BraceRight | RawRType.ParenLeft | RawRType.ParenRight | RawRType.Semicolon
/**
 * Combines '`{`', '`}`', '`(`', '`)`', and other delimiters used by R, they are ignored for most analysis
 * but helpful during reconstruction.
 */
export interface RDelimiter extends MergeableRecord, Location {
	readonly type:    RType.Delimiter;
	readonly lexeme:  string;
	readonly subtype: RDelimiterNode;
}
