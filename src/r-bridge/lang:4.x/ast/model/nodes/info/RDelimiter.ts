import { Type } from '../../type'
import { MergeableRecord } from '../../../../../../util/objects'


/**
 * Combines '`{`', '`}`', '`(`', '`)`', and other delimiters used by R, they are ignored for most analysis
 * but helpful during reconstruction.
 */
export interface RDelimiter extends MergeableRecord, Location {
	readonly type:    Type.Delimiter;
	readonly lexeme:  string;
	readonly subtype: string; // can be one of Type, but I do not guard it atm.
}
