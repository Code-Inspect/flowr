import type { RawRType, RType } from '../../type'
import type { Location } from '../../model'
import type { MergeableRecord } from '../../../../../../util/objects'

/**
 * Combines '`{`', '`}`', '`(`', '`)`', and other delimiters used by R, they are ignored for most analysis
 * but helpful during reconstruction.
 */
export interface RDelimiter extends MergeableRecord, Location {
	readonly type:    RType.Delimiter;
	readonly lexeme:  string;
	readonly subtype: RawRType;
}
