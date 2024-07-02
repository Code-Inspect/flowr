import { guard } from './assert'

// xmlparsedata uses its own start and end only to break ties and calculates them on max col width approximation
export type SourcePosition = [
	/** starts with 1 */
	line:   number,
	/** starts with 1 */
	column: number
]

export type SourceRange = [
	/** inclusive start position */
	startLine:   number,
	startColumn: number,
	/** inclusive end position */
	endLine:     number,
	endColumn:   number
]

export function getRangeStart(p: undefined): undefined
export function getRangeStart(p: SourceRange): SourcePosition
export function getRangeStart(p: SourceRange | undefined): SourcePosition | undefined
export function getRangeStart(p: SourceRange | undefined): SourcePosition | undefined {
	return p === undefined ? undefined : [p[0], p[1]]
}

export function getRangeEnd(p: undefined): undefined
export function getRangeEnd(p: SourceRange): SourcePosition
export function getRangeEnd(p: SourceRange | undefined): SourcePosition | undefined
export function getRangeEnd(p: SourceRange | undefined): SourcePosition | undefined {
	return p === undefined ? undefined : [p[2], p[3]]
}

/**
 * This does not ensure ordering of start and end!
 *
 * @param sl - start line
 * @param sc - start column
 * @param el - end line
 * @param ec - end column
 */
export function rangeFrom(sl: number | string, sc: number | string, el: number | string, ec: number | string): SourceRange {
	return [Number(sl), Number(sc), Number(el), Number(ec)]
}

export function mergeRanges(...rs: SourceRange[]): SourceRange {
	guard(rs.length > 0, 'Cannot merge no ranges')
	return rs.reduce(([sl, sc, el, ec], [nsl, nsc, nel, nec]) => [
		...(sl < nsl || (sl === nsl && sc < nsc) ? [sl, sc] : [nsl, nsc]),
		...(el > nel || (el === nel && ec > nec) ? [el, ec] : [nel, nec])
	] as SourceRange, rs[0])
}

/**
 * @returns true iff `r1` starts and ends before `r2` starts (i.e., if `r1` and `r2` do not overlap and `r1` comes before `r2`
 */
export function rangeStartsCompletelyBefore([,,r1el,r1ec]: SourceRange, [r2sl,r2sc,,]: SourceRange): boolean {
	return r1el < r2sl || (r1el === r2sl && r1ec < r2sc)
}

/**
 * Checks if the two ranges overlap.
 */
export function rangesOverlap([r1sl,r1sc,r1el,r1ec]: SourceRange, [r2sl,r2sc,r2el,r2ec]: SourceRange): boolean {
	return r1sl <= r2el && r2sl <= r1el && r1sc <= r2ec && r2sc <= r1ec
}

export function addRanges([r1sl,r1sc,r1el,r1ec]: SourceRange, [r2sl,r2sc,r2el,r2ec]: SourceRange): SourceRange {
	return [r1sl+r2sl, r1sc+r2sc, r1el+r2el, r1ec+r2ec]
}

/**
 * Provides a comparator for {@link SourceRange}s that sorts them in ascending order.
 *
 * @returns a positive number if `r1` comes after `r2`, a negative number if `r1` comes before `r2`, and `0` if they are equal
 */
export function rangeCompare([r1sl,r1sc,,]: SourceRange, [r2sl,r2sc,,]: SourceRange): number {
	if(r1sl === r2sl) {
		return r1sc - r2sc
	} else {
		return r1sl - r2sl
	}
}
