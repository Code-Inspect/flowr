import { guard } from './assert'

/**
 * Returns the tail of an array (all elements except the first one).
 */
export type TailOfArray<T extends unknown[]> = T extends [infer _, ...infer Rest] ? Rest : never;

/**
 * Splits the array every time the given predicate fires.
 * The element the split appears on will not be included!
 *
 * @example with this we can split on all empty strings:
 * ```
 * splitArrayOn(['a', '', 'b', '', '', 'c'], elem => elem === '')
 * // => [['a'], ['b'], [], ['c']]
 * ```
 * @example if the last element satisfies the predicate, this will add an empty array element
 * ```
 * splitArrayOn([1,2,3], elem => true)
 * // => [[], [], [], []]
 * ```
 */
export function splitArrayOn<T>(arr: readonly T[], predicate: (elem: T) => boolean): T[][] {
	const result: T[][] = []
	let current: T[] = []
	let fired = false
	for(const elem of arr) {
		if(predicate(elem)) {
			result.push(current)
			current = []
			fired = true
		} else {
			current.push(elem)
		}
	}

	if(fired || current.length > 0) {
		result.push(current)
	}
	return result
}

/**
 * Returns a tuple of two arrays, where the first one contains all elements for which the predicate returned true,
 * and the second one contains all elements for which the predicate returned false.
 */
export function partitionArray<T>(arr: readonly T[], predicate: (elem: T) => boolean): [T[], T[]] {
	const left: T[] = []
	const right: T[] = []
	for(const elem of arr) {
		if(predicate(elem)) {
			left.push(elem)
		} else {
			right.push(elem)
		}
	}
	return [left, right]
}

/**
 * Generate all permutations of the given array using Heap's algorithm (with its non-recursive variant).
 *
 * @param arr - The array to permute
 * @see getUniqueCombinationsOfSize
 */
export function *allPermutations<T>(arr: T[]): Generator<T[], void, void>  {
	yield arr.slice()
	const c = new Array(arr.length).fill(0) as number[]
	let i = 1

	while(i < arr.length) {
		if(c[i] >= i) {
			c[i] = 0
			++i
		} else {
			// save the swap to 0 (https://stackoverflow.com/questions/9960908/permutations-in-javascript/37580979#37580979)
			const k = i % 2 && c[i]
			const p = arr[i]
			arr[i] = arr[k]
			arr[k] = p
			++c[i]
			i = 1
			yield arr.slice()
		}
	}
}

export function partition<T>(arr: T[], predicate: (elem: T) => boolean): [T[], T[]] {
	const left: T[] = []
	const right: T[] = []
	for(const elem of arr) {
		if(predicate(elem)) {
			left.push(elem)
		} else {
			right.push(elem)
		}
	}
	return [left, right]
}

/**
 * Generate all unique combinations of the array with the given size.
 * In other words, given `[a,b,c]`, as well as `minSize=2` and `maxSize=2`, this will generate `[a,b]`, `[a,c]` and `[b,c]`,
 * but not, e.g., `[a,a]` or `[b,a]`.
 *
 * If `minSize!=maxSize`, the result is guaranteed to be sorted by size.
 *
 * @param array   - The array to generate combinations from
 * @param minSize - The inclusive minimum size of the combinations, must be at least `0` and at most `maxSize`
 * @param maxSize - The inclusive maximum size of the combinations, must be at least `minSize` and at most `array.length`
 */
export function *getUniqueCombinationsOfSize<T>(array: T[], minSize = 0, maxSize = array.length): Generator<T[], void, void> {
	guard(minSize >= 0 && minSize <= maxSize, 'minSize must be at least 0 and at most maxSize')
	guard(maxSize >= minSize && maxSize <= array.length, 'maxSize must be at least minSize and at most the length of the array')
	if(minSize === maxSize && minSize === 1) {
		for(const elem of array) {
			yield [elem]
		}
		return
	}

	function *p(t: T[], i: number, newArr: boolean): Generator<T[], void, void> {
		// start yielding if min size is reached
		if(t.length >= minSize) {
			// only yield if the array has been modified
			if(newArr) {
				yield t
			}
			// stop yielding if inclusive max size is reached
			if(t.length >= maxSize) {
				return
			}
		}
		if(i >= array.length) {
			return
		}
		yield* p(t.concat(array[i]), i + 1, true)
		yield* p(t, i + 1, false)
	}

	yield* p([], 0, true)
}

/**
 * Returns the sum of all elements in the given array
 */
export function sum(arr: number[]): number {
	let sum = 0
	for(const elem of arr) {
		sum += elem
	}
	return sum
}

/**
 * Converts an array into a bag data-structure (in the form of a map mapping the entries/keys to their counts)
 */
export function array2bag<T>(arr: T[]): Map<T, number> {
	const result = new Map<T, number>()
	for(const elem of arr) {
		result.set(elem, (result.get(elem) ?? 0) + 1)
	}
	return result
}

export function arrayEqual<T>(a: readonly T[] | undefined, b: readonly T[] | undefined): boolean {
	if(a === undefined || b === undefined) {
		return a === b
	}
	if(a.length !== b.length) {
		return false
	}
	for(let i = 0; i < a.length; ++i) {
		if(a[i] !== b[i]) {
			return false
		}
	}
	return true
}
