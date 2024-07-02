import { assert } from 'chai'
import type { Mergeable } from '../../../src/util/objects'
import { deepMergeObject, isObjectOrArray } from '../../../src/util/objects'

describe('Objects', () => {
	describe('isObjectOrArray', () => {
		const positive = (a: unknown, msg: string): void => {
			it(msg, () => {
				assert.isTrue(isObjectOrArray(a)) 
			})
		}
		const negative = (a: unknown, msg: string): void => {
			it(msg, () => {
				assert.isFalse(isObjectOrArray(a), `${msg} is not considered an object`) 
			})
		}

		describe('return true for objects', () => {
			positive({}, 'null')
			positive({}, 'empty object')
			positive({ a: 'x', b: 0 }, 'non-empty object')
		})
		describe('return true for arrays', () => {
			positive([], 'empty array')
			positive([1, 2, 3], 'non-empty array')
		})

		describe('return false for neither objects nor arrays', () => {
			negative(true, 'a boolean')
			negative('hello', 'a string')
			negative(42, 'a number')
			negative(undefined, 'undefined')
		})
	})

	describe('deepMergeObject', () => {
		const merged = <T extends Mergeable>(a: T, b: T, expected: T, msg: string): void => {
			it(msg, () => {
				assert.deepStrictEqual(deepMergeObject(a, b), expected, `${JSON.stringify(a)} & ${JSON.stringify(b)}`)
			})
		}
		const throws = <T extends Mergeable>(a: T, b: T, msg: string): void => {
			it(msg, () => {
				assert.throws(() => deepMergeObject(a, b), Error, undefined, msg)
			})
		}
		describe('objects only', () => {
			describe('with empty', () => {
				for(const empty of [null, undefined, {}] as Mergeable[]) {
					const emptyStr = JSON.stringify(empty)
					describe(`using ${emptyStr}`, () => {
						merged(empty, empty, empty, `two ${emptyStr} objects`)
						for(const obj of [{ a: 1 }, { a: 1, b: 2 }, { a: 1, b: 2, c: { d: 3, e: 4 } }]) {
							describe(JSON.stringify(obj), () => {
								merged(obj, empty, obj, 'obj with empty')
								merged(empty, obj, obj, 'empty with obj')
							})
						}
					})
				}
			})
			describe('two non-empty (including overwrite)', () => {
				merged({ a: 3 }, { b: 4 }, { a: 3, b: 4 }, 'two disjoint objects')
				merged({ a: 3, b: 4 }, { b: 5 }, { a: 3, b: 5 }, 'overwrite values (b)')
				merged({ a: 3, b: { c: 4, d: 5 } }, { b: { c: 42 } }, { a: 3, b: { c: 42, d: 5 } }, 'overwrite nested (c)')
				merged({ a: 3, b: { c: 4, d: 5 } }, { b: { e: 6 } }, { a: 3, b: { c: 4, d: 5, e: 6 } }, 'join nested (e)')
				merged({ a: 3, b: { c: 4, d: 5, e: {} } }, { b: { e: { f: 6 } } }, { a: 3, b: { c: 4, d: 5, e: { f: 6 } } }, 'double nested objects (f)')
			})
			describe('allow null', () => {
				merged({ a: 3, b: null }, { b: { c: 42 } }, { a: 3, b: { c: 42 } }, 'overwrite null with object (b)')
				merged({ b: { c: 42 } }, { a: 3, b: null }, { a: 3, b: { c: 42 } }, 'keep object with null (b)')
			})
			describe('error if incompatible', () => {
				throws({ a: 3 }, { a: { b: 3 } }, 'literal with object')
				throws({ a: 3 }, { a: { b: 3 } }, 'array with object')
				throws({ a: { b: null } }, { a: { b: 3 } }, 'null obj with literal')
			})
		})
		describe('arrays only', () => {
			describe('with empty', () => {
				for(const empty of [null, undefined, []] as Mergeable[]) {
					const emptyStr = JSON.stringify(empty)
					describe(`using ${emptyStr}`, () => {
						merged(empty, empty, empty, `two ${emptyStr} arrays`)
						for(const arr of [[1], [1, 2], [1, 2, 3]]) {
							describe(JSON.stringify(arr), () => {
								merged(arr, empty, arr, 'arr with empty')
								merged(empty, arr, arr, 'empty with arr')
							})
						}
					})
				}
			})
			describe('two non-empty (no overwrite)', () => {
				merged([3], [4], [3, 4], 'two disjoint arrays')
				merged([3, 4], [5], [3, 4, 5], 'no overwrite for multiple elements')
				merged([3, 4], [4], [3, 4, 4], 'keep duplicates')
				merged([1, [3, 4]], [2, [5]], [1, [3, 4], 2, [5]], 'do not merge nested arrays')
				merged([{ a: 3 }, 2], [{ a: 4 }], [{ a: 3 }, 2, { a: 4 }], 'do not merge nested objects')
			})
		})
		describe('mixed objects and arrays', () => {
			merged({ a: 3, b: [4, 5] }, { b: [4] }, { a: 3, b: [4, 5, 4] }, 'merge arrays in objects')
			merged({ a: 3, b: { c: 5, d: { e: 6, f: [4, 5] }, g: [-1, 0] } },
				{ x: 5, b: { c: 6, d: { f: [3], y: 9 }, g: [1], h: [4] } },
				{ a: 3, b: { c: 6, d: { e: 6, f: [4, 5, 3], y: 9 }, g: [-1, 0, 1], h: [4] }, x: 5 }, 'merge deeply nested objects')
			describe('error if incompatible', () => {
				throws({ a: 3 }, [3], 'object with array')
				throws([3], { a: 3 }, 'array with object')
				throws({ a: { b: null } }, { a: { b: 3 } }, 'object of array with arrays of object')
			})
			describe('forced illegal to test robustness against type-lies', () => {
				// @ts-expect-error we want to test against type-lies
				throws(3 as object, 4 as object, 'lied numbers as objects')
				// @ts-expect-error like before, we guard against type-lies
				throws(true as boolean[], true as boolean[], 'lied booleans as arrays')
			})
		})
		describe('with undefined', () => {
			merged({ a: 3, b: 4 }, { a: undefined, b: 7 }, { a: 3, b: 7 }, 'do not overwrite on undefined')
		})
	})
})
