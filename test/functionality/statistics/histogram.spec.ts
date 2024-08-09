import { assert } from 'chai'
import { histogramFromNumbers } from '../../../src/statistics/summarizer/post-process/histogram'

describe('Histogram', () => {
	describe('histogramFromNumbers', () => {
		describe('guard invalid inputs', () => {
			it('Fail for no values', () => {
				assert.throws(() => histogramFromNumbers('test', 10, []))
			})
			it('Fail for <= 0 bin size', () => {
				assert.throws(() => histogramFromNumbers('test', 0, [1]), undefined, 'binSize must be greater than 0, but was 0')
				assert.throws(() => histogramFromNumbers('test', -5, [1]), undefined, 'binSize must be greater than 0, but was -5')
			})
		})
		const withBins = (binSize: number, values: number[], expectedBins: number[]) => {
			it(`${binSize}-sized bins with ${JSON.stringify(values)}`, () => {
				assert.deepStrictEqual(histogramFromNumbers('test', binSize, values).bins, expectedBins, `With ${binSize}-sized bins, ${JSON.stringify(values)} should produce ${JSON.stringify(expectedBins)}`)
			})
		}
		describe('for single values', () => {
			/* because there always is a bin for the lowest value */
			withBins(1, [1], [1, 0])
			withBins(2, [1], [1, 0])
		})
		describe('for multiple unique values', () => {
			withBins(1, [1,2,3], [1,0,1,1])
			withBins(3, [5,6,7], [1,2])
			withBins(4, [1,2,3], [1,2])
			withBins(2, [1,2,3], [1,1,1])
		})
		describe('for multiple repeated values', () => {
			withBins(1, [1,2,3,1], [2,0,1,1])
			withBins(3, [5,6,2,1,3,5,6], [1 /* for the single 1 */,2 /* for 2, 3 */ ,4 /* for 4+ (5, 6, 5, 6) */])
			withBins(4, [1,2,3,1,2,3], [2, 4])
			withBins(2, [8,1,0], [1,1,0,0,0,1])
		})
		describe('check differentiation for first bucket', () => {
			withBins(20, [0,1,15,20,21,22,39,40,41,42,61], [1 /* 0 */,2 /* 1, 15 */,4 /* 20-39 */,3 /* 40-42*/,1 /* 61 */])
		})
	})
})
