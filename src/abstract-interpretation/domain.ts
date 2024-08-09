import { assertUnreachable, guard } from '../util/assert'

interface IntervalBound {
	readonly value:     number,
	readonly inclusive: boolean
}

export class Interval {
	constructor(readonly min: IntervalBound, readonly max: IntervalBound) {
		guard(min.value <= max.value, () => `The interval ${this.toString()} has a minimum that is greater than its maximum`)
		guard(min.value !== max.value || (min.inclusive === max.inclusive), `The bound ${min.value} cannot be in- and exclusive at the same time`)
	}

	toString(): string {
		return `${this.min.inclusive ? '[' : '('}${this.min.value}, ${this.max.value}${this.max.inclusive ? ']' : ')'}`
	}
}

export class Domain {
	private readonly _intervals: Set<Interval>

	private constructor(intervals: Interval[] = []) {
		this._intervals = new Set(unifyOverlappingIntervals(intervals))
	}

	static bottom(): Domain {
		return new Domain()
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

	get intervals(): Set<Interval> {
		return this._intervals
	}

	private set intervals(intervals: Interval[]) {
		this._intervals.clear()
		for(const interval of intervals) {
			this._intervals.add(interval)
		}
	}

	addInterval(interval: Interval): void {
		this.intervals = unifyOverlappingIntervals([...this.intervals, interval])
	}

	toString(): string {
		return `{${Array.from(this.intervals).join(', ')}}`
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

export function doIntervalsOverlap(interval1: Interval, interval2: Interval): boolean {
	const diff1 = compareIntervals(CompareType.IgnoreInclusivity, interval1.max, interval2.min)
	const diff2 = compareIntervals(CompareType.IgnoreInclusivity, interval2.max, interval1.min)

	// If one interval ends before the other starts, they don't overlap
	if(diff1 < 0 || diff2 < 0) {
		return false
	}
	// If their end and start are equal, they only overlap if both are inclusive
	if(diff1 === 0) {
		return interval1.max.inclusive && interval2.min.inclusive
	}
	if(diff2 === 0) {
		return interval2.max.inclusive && interval1.min.inclusive
	}

	return true
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
		if(doIntervalsOverlap(currentInterval, nextInterval)) {
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