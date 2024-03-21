import { guard } from './assert'

// xmlparsedata uses its own start and end only to break ties and calculates them on max col width approximation
export interface SourcePosition {
	/** starts with 1 */
	line:   number
	/** starts with 1 */
	column: number
}

export interface SourceRange {
	/** inclusive start position */
	readonly start: SourcePosition
	/** inclusive end position */
	readonly end:   SourcePosition
}

/**
 * at the moment this does not ensure ordering of start and end!
 */
export function rangeFrom(line1: number | string, col1: number | string, line2: number | string, col2: number | string): SourceRange {
	return {
		start: {
			line:   Number(line1),
			column: Number(col1)
		},
		end: {
			line:   Number(line2),
			column: Number(col2)
		}
	}
}

export function mergeRanges(...rs: SourceRange[]): SourceRange {
	guard(rs.length > 0, 'Cannot merge no ranges')

	return {
		start: rs.reduce((acc, r) => acc.line < r.start.line || (acc.line === r.start.line && acc.column < r.start.column) ? acc : r.start, rs[0].start),
		end:   rs.reduce((acc, r) => acc.line > r.end.line || (acc.line === r.end.line && acc.column > r.end.column) ? acc : r.end, rs[0].end)
	}
}

/**
 * @returns true iff `r1` starts and ends before `r2` starts (i.e., if `r1` and `r2` do not overlap and `r1` comes before `r2`
 */
export function rangeStartsCompletelyBefore(r1: SourceRange, r2: SourceRange): boolean {
	return r1.end.line < r2.start.line || (r1.end.line === r2.start.line && r1.end.column < r2.start.column)
}

/**
 * Checks if the two ranges overlap.
 */
export function rangesOverlap(r1: SourceRange, r2: SourceRange): boolean {
	return r1.start.line <= r2.end.line && r2.start.line <= r1.end.line && r1.start.column <= r2.end.column && r2.start.column <= r1.end.column
}

export function addRanges(r1: SourceRange, r2: SourceRange): SourceRange {
	return rangeFrom(r1.start.line + r2.start.line, r1.start.column + r2.start.column, r1.end.line + r2.end.line, r1.end.column + r2.end.column)
}

/**
 * Provides a comparator for {@link SourceRange}s that sorts them in ascending order.
 *
 * @returns a positive number if `r1` comes after `r2`, a negative number if `r1` comes before `r2`, and `0` if they are equal
 */
export function rangeCompare(r1: SourceRange, r2: SourceRange): number {
	if(r1.start.line === r2.start.line) {
		return r1.start.column - r2.start.column
	} else {
		return r1.start.line - r2.start.line
	}
}
