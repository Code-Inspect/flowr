import { assert } from 'chai'
import type { SourceRange } from '../../../../../src/util/range'
import { mergeRanges, rangeFrom } from '../../../../../src/util/range'
import { allPermutations } from '../../../../../src/util/arrays'

describe('Model specific tests', () => {
	describe('mergeRanges', () => {
		it('deny to merge no ranges', () => {
			assert.throws(() => mergeRanges(), Error)
		})
		const assertMerged = (ranges: SourceRange[], expected: SourceRange, message = ''): void => {
			it(JSON.stringify(ranges), () => {
				assert.deepStrictEqual(mergeRanges(...ranges), expected, `${message}`)
			})
		}
		describe('one ranges always returns the same', () => {
			for(const range of [
				rangeFrom(0, 0, 0, 0),
				rangeFrom(1, 1, 1, 1),
				rangeFrom(1, 1, 5, 2),
				rangeFrom(9, 3, 42, 1)
			]) {
				assertMerged([range], range, 'should be returned as is')
			}
		})
		describe('merge two consecutive ranges', () => {
			assertMerged([
				rangeFrom(1, 1, 1, 1),
				rangeFrom(1, 2, 1, 2)
			], rangeFrom(1, 1, 1, 2))
			assertMerged([
				rangeFrom(1, 1, 1, 1),
				rangeFrom(1, 2, 1, 3)
			], rangeFrom(1, 1, 1, 3))
			assertMerged([
				rangeFrom(1, 1, 1, 1),
				rangeFrom(1, 2, 1, 4)
			], rangeFrom(1, 1, 1, 4))
		})
		describe('merge two non-consecutive ranges', () => {
			assertMerged([
				rangeFrom(1, 1, 1, 1),
				rangeFrom(1, 3, 1, 3)
			], rangeFrom(1, 1, 1, 3))
			assertMerged([
				rangeFrom(3, 1, 3, 3),
				rangeFrom(4, 3, 6, 4)
			], rangeFrom(3, 1, 6, 4))
		})
		describe('merge result is independent from order', () => {
			const a = rangeFrom(1, 2, 1, 2)
			const b = rangeFrom(4, 2, 5, 9)
			const c = rangeFrom(42, 3, 6, 6)
			for(const perm of allPermutations([a, b, c])) {
				assertMerged(perm, rangeFrom(1, 2, 6, 6))
			}
		})
	})
})
