import { removeRQuotes } from '../../../src/r-bridge'
import { assert } from 'chai'
import { randomString } from '../../../src/util/random'

describe('(AST) Retriever', () => {
	describe('helper functions', () => {
		describe('removeTokenMapQuotationMarks', () => {
			describe('extract', () => {
				const positive = (source: string): void => {
					describe(source === '' ? '<empty>' : `${source}`, () => {
						for(const letter of ['"', "'", '']) {
							const str = `${letter}${source}${letter}`
							it(letter === '' ? '<none>' : `${letter}`, () => {
								assert.strictEqual(removeRQuotes(str), source, `${str} should be ${source}`)
							})
						}
					})
				}
				positive('')
				positive('a')
				positive('ReallyLongWord')
			})
			it('should never throw', () => {
				for(let i = 1; i < 20; i++) {
					const randomStr = randomString(i)
					assert.doesNotThrow(() => removeRQuotes(randomStr), undefined, `should not throw for ${randomStr}`)
				}
			})
		})
	})
})
