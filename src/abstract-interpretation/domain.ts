import { assertUnreachable, guard } from '../util/assert'

interface IntervalBound {
	readonly value:     number,
	readonly inclusive: boolean
}

export class Interval {
	constructor(readonly min: IntervalBound, readonly max: IntervalBound) {
		guard(min.value <= max.value, () => `The interval ${this.toString()} has a minimum that is greater than its maximum`)
	}

	static top(): Interval {
		return new Interval(
			{ value: Number.NEGATIVE_INFINITY, inclusive: false },
			{ value: Number.POSITIVE_INFINITY, inclusive: false }
		)
	}

	toString(): string {
		if(this.isBottom()) {
			return '∅'
		}
		if(this.isSingleton()) {
			return this.min.value.toString()
		}
		return `${this.min.inclusive ? '[' : '('}${this.min.value}, ${this.max.value}${this.max.inclusive ? ']' : ')'}`
	}

	/** An interval is considered empty if it's of the form [T, T) or (T, T] */
	isBottom(): boolean {
		return this.min.value === this.max.value && !(this.min.inclusive && this.max.inclusive)
	}

	/** An interval is considered singleton if it's of the form [T, T] */
	isSingleton(): boolean {
		return this.min.value === this.max.value && this.min.inclusive && this.max.inclusive
	}

	/** An interval is considered top if it's of the form (-∞, ∞) */
	isTop(): boolean {
		return this.min.value === Number.NEGATIVE_INFINITY && this.max.value === Number.POSITIVE_INFINITY
	}
}

export class Domain {
	private readonly _intervals: Set<Interval>

	private constructor(intervals: Interval[] = []) {
		this._intervals = new Set(unifyOverlappingIntervals(intervals).filter(interval => !interval.isBottom()))
	}

	static bottom(): Domain {
		return new Domain()
	}

	static top(): Domain {
		return new Domain([Interval.top()])
	}

	static fromIntervals(intervals: Interval[] | Set<Interval>): Domain {
		return new Domain(Array.from(intervals))
	}

	static fromScalar(n: number): Domain {
		return new Domain([new Interval(
			{ value: n, inclusive: true },
			{ value: n, inclusive: true }
		)])
	}

	isBottom(): boolean {
		return this.intervals.size === 0
	}

	isTop(): boolean {
		return this.intervals.size === 1 && Array.from(this.intervals)[0].isTop()
	}

	get intervals(): Set<Interval> {
		return this._intervals
	}

	toString(): string {
		if(this.isBottom()) {
			return '⊥'
		} else if(this.isTop()) {
			return '⊤'
		} else {
			return `{${Array.from(this.intervals).join(', ')}}`
		}
	}
}

const enum CompareType {
	/** If qual, the bound that's inclusive is the smaller one */
	Min,
	/** If equal, the bound that's inclusive is the greater one */
	Max,
	/** Equality is only based on the "raw" values */
	IgnoreInclusivity
}

function compareIntervals(compareType: CompareType, interval1: IntervalBound, interval2: IntervalBound): number {
	const diff = interval1.value - interval2.value
	if(diff !== 0 || compareType === CompareType.IgnoreInclusivity) {
		return diff
	}
	switch(compareType) {
		case CompareType.Min:
			return Number(!interval1.inclusive) - Number(!interval2.inclusive)
		case CompareType.Max:
			return Number(interval1.inclusive) - Number(interval2.inclusive)
		default:
			assertUnreachable(compareType)
	}
}

function compareIntervalsByTheirMinimum(interval1: Interval, interval2: Interval): number {
	return compareIntervals(CompareType.Min, interval1.min, interval2.min)
}

function compareIntervalsByTheirMaximum(interval1: Interval, interval2: Interval): number {
	return compareIntervals(CompareType.Max, interval1.max, interval2.max)
}

export const enum OverlapKind {
	Overlap = 0,
	Touch = 1,
}

export function doIntervalsOverlap(interval1: Interval, interval2: Interval, kind: OverlapKind = OverlapKind.Overlap): boolean {
	const diff1 = compareIntervals(CompareType.IgnoreInclusivity, interval1.max, interval2.min)
	const diff2 = compareIntervals(CompareType.IgnoreInclusivity, interval2.max, interval1.min)

	let doIntervalsOverlap = true
	let doIntervalsTouch = true

	// If one interval ends before the other starts, they don't overlap
	if(diff1 < 0 || diff2 < 0) {
		doIntervalsOverlap = false
		doIntervalsTouch = false
	// If their bounds have the same value, they overlap if both are inclusive
	// and touch if only one is inclusive
	} else if(diff1 === 0) {
		doIntervalsOverlap = interval1.max.inclusive && interval2.min.inclusive
		doIntervalsTouch = interval1.max.inclusive !== interval2.min.inclusive
	} else if(diff2 === 0) {
		doIntervalsOverlap = interval2.max.inclusive && interval1.min.inclusive
		doIntervalsTouch = interval2.max.inclusive !== interval1.min.inclusive
	}

	switch(kind) {
		case OverlapKind.Overlap:
			return doIntervalsOverlap
		case OverlapKind.Touch:
			return doIntervalsTouch
		default:
			return doIntervalsOverlap && doIntervalsTouch
	}
}

export function unifyDomains(domains: Domain[]): Domain {
	const unifiedIntervals = unifyOverlappingIntervals(domains.flatMap(domain => Array.from(domain.intervals)))
	return Domain.fromIntervals(unifiedIntervals)
}

export function unifyOverlappingIntervals(intervals: Interval[]): Interval[] {
	if(intervals.length === 0) {
		return []
	}
	const sortedIntervals = intervals.sort(compareIntervalsByTheirMinimum)

	const unifiedIntervals: Interval[] = []
	let currentInterval = sortedIntervals[0]
	for(const nextInterval of sortedIntervals) {
		if(doIntervalsOverlap(currentInterval, nextInterval, OverlapKind.Touch | OverlapKind.Overlap)) {
			const intervalWithEarlierStart = compareIntervalsByTheirMinimum(currentInterval, nextInterval) < 0 ? currentInterval : nextInterval
			const intervalWithLaterEnd = compareIntervalsByTheirMaximum(currentInterval, nextInterval) > 0 ? currentInterval : nextInterval
			currentInterval = new Interval(intervalWithEarlierStart.min, intervalWithLaterEnd.max)
		} else {
			unifiedIntervals.push(currentInterval)
			currentInterval = nextInterval
		}
	}
	unifiedIntervals.push(currentInterval)
	return unifiedIntervals
}

export function addDomains(domain1: Domain, domain2: Domain): Domain {
	const intervals = new Set<Interval>()
	for(const interval1 of domain1.intervals) {
		for(const interval2 of domain2.intervals) {
			intervals.add(new Interval({
				value:     interval1.min.value + interval2.min.value,
				inclusive: interval1.min.inclusive && interval2.min.inclusive
			}, {
				value:     interval1.max.value + interval2.max.value,
				inclusive: interval1.max.inclusive && interval2.max.inclusive
			}))
		}
	}
	return Domain.fromIntervals(intervals)
}

export function subtractDomains(domain1: Domain, domain2: Domain): Domain {
	const intervals = new Set<Interval>()
	for(const interval1 of domain1.intervals) {
		for(const interval2 of domain2.intervals) {
			intervals.add(new Interval({
				value:     interval1.min.value - interval2.max.value,
				inclusive: interval1.min.inclusive && interval2.max.inclusive
			}, {
				value:     interval1.max.value - interval2.min.value,
				inclusive: interval1.max.inclusive && interval2.min.inclusive
			}))
		}
	}
	return Domain.fromIntervals(intervals)
}

export const enum NarrowKind {
	Equal = 1,
	Smaller = 2,
	Greater = 4
}

interface IntervalOverlap {
	smaller:      Interval | undefined,
	intersection: Interval | undefined,
	larger:       Interval | undefined
}

function flipInclusiveness(intervalBound: IntervalBound): IntervalBound {
	return { value: intervalBound.value, inclusive: !intervalBound.inclusive }
}

export function overlapIntervals(interval1: Interval, interval2: Interval): IntervalOverlap {
	const diffMin = compareIntervalsByTheirMinimum(interval1, interval2)
	const diffMax = compareIntervalsByTheirMaximum(interval1, interval2)

	if(!doIntervalsOverlap(interval1, interval2)) {
		if(diffMin < 0) {
			return { smaller: interval1, intersection: undefined, larger: undefined }
		} else if(diffMin > 0) {
			return { smaller: undefined, intersection: undefined, larger: interval1 }
		} else {
			guard(false, 'Their lower bounds cannot be the same as they do not overlap') 
		}
	}

	const intersectionStart = diffMin > 0 ? interval1.min : interval2.min
	const intersectionEnd = diffMax < 0 ? interval1.max : interval2.max
	const intersection = new Interval(intersectionStart, intersectionEnd)

	const smallerOverhang = diffMin < 0 ? new Interval(interval1.min, flipInclusiveness(intersectionStart)) : undefined
	const greaterOverhang = diffMax > 0 ? new Interval(flipInclusiveness(intersectionEnd), interval1.max) : undefined

	return {
		smaller:      smallerOverhang,
		intersection: intersection,
		larger:       greaterOverhang
	}
}

export function narrowDomain(baseDomain: Domain, boundDomain: Domain, narrowKind: NarrowKind): Domain {
	const isSmaller = (narrowKind & NarrowKind.Smaller) !== 0
	const isGreater = (narrowKind & NarrowKind.Greater) !== 0
	const isEqual = (narrowKind & NarrowKind.Equal) !== 0

	guard(!(isGreater && isSmaller), 'Greater and Smaller cannot be combined')

	let getNarrowedIntervals: (overlap: IntervalOverlap, bound: Interval) => (Interval | undefined)[]
	if(isGreater) {
		getNarrowedIntervals = ({ intersection, larger }, bound) => {
			if(!isEqual && intersection !== undefined && compareIntervalsByTheirMinimum(intersection, bound) === 0) {
				intersection = new Interval({ value: intersection.min.value, inclusive: false }, intersection.max)
			}
			return [intersection, larger]
		}
	} else if(isSmaller) {
		getNarrowedIntervals = ({ smaller, intersection }, bound) => {
			if(!isEqual && intersection !== undefined && compareIntervalsByTheirMaximum(intersection, bound) === 0) {
				intersection = new Interval(intersection.min, { value: intersection.max.value, inclusive: false })
			}
			return [intersection, smaller]
		}
	} else {
		guard(false, 'Either isGreater or isSmaller must be set')
	}

	const narrowedIntervals: (Interval | undefined)[] = []
	for(const baseInterval of baseDomain.intervals) {
		for(const boundInterval of boundDomain.intervals) {
			const overlap = overlapIntervals(baseInterval, boundInterval)
			console.log(`Prompt:  ${baseInterval.toString()} ${isSmaller ? '<' : ''}${isGreater ? '>' : ''}${isEqual ? '=' : ''} ${boundInterval.toString()}`)
			console.log(`Overlap: ${(overlap.smaller ?? 'none').toString()} ${(overlap.intersection ?? 'none').toString()} ${(overlap.larger ?? 'none').toString()}`)
			narrowedIntervals.push(...getNarrowedIntervals(overlap, boundInterval))
		}
	}

	const newDomain = Domain.fromIntervals(narrowedIntervals.filter(interval => interval !== undefined).map(interval => interval as Interval))
	console.log(`Domain: ${newDomain.toString()}`)
	return newDomain
}