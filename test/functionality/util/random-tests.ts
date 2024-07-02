// noinspection SpellCheckingInspection

import { ALPHABET, randomString } from '../../../src/util/random'
import { assert } from 'chai'

describe('Random', () => {
	describe('randomString', () => {
		it('with one source only', () => {
			assert.equal(randomString(7, ['a']), 'aaaaaaa')
		})
		it('correct length', () => {
			for(let stringLength = 0; stringLength < 50; stringLength++) {
				for(let repetition = 0; repetition < 20; repetition++) {
					assert.equal(randomString(stringLength).length, stringLength)
				}
			}
		})
		it('only contain valid characters', () => {
			for(const source of [
				ALPHABET,
				ALPHABET.slice(0, 26),
				['1', '2', '3', 'x'],
			]) {
				for(let stringLength = 0; stringLength < 20; stringLength++) {
					for(let repetition = 0; repetition < 5; repetition++) {
						[...randomString(stringLength, source)].forEach((char) => {
							assert.include(source, char, `for length ${stringLength}`)
						})
					}
				}
			}
		})
		describe('guard against illegal arguments', () => {
			it('negative', function() {
				for(const length of [-Infinity, -42, -2, -1]) {
					assert.throws(
						() => randomString(length),
						Error,
						undefined,
						`length must be positive (${length} >= 0)`
					)
				}
			})
			it('NaN and Infinity', function() {
				for(const length of [Infinity, NaN]) {
					assert.throws(
						() => randomString(length),
						Error,
						undefined,
						`length must be neither NaN nor Infinity (${length}`
					)
				}
			})
			it('floating point', function() {
				for(const length of [2.3, 42.42, Math.PI]) {
					assert.throws(
						() => randomString(length),
						Error,
						undefined,
						`length must be an integer (${length}`
					)
				}
			})
			it('empty source', function() {
				assert.throws(
					() => randomString(42, []),
					Error,
					undefined,
					'source must not be empty'
				)
			})
		})
	})
})
