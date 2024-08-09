import { assert } from 'chai'
import { setEquals } from '../../../src/util/set'
import { jsonReplacer } from '../../../src/util/json'
import type { Test } from 'mocha'

describe('Set (operations)', () => {
	describe('setEquals', () => {
		function test<T>(name: string, should: boolean, a: Set<T>, b: Set<T>): Test {
			return it(name, () =>
				assert.equal(setEquals(a, b), should, JSON.stringify(a, jsonReplacer) + ' ' + JSON.stringify(b, jsonReplacer)
				))
		}

		test('empty sets', true, new Set(), new Set())
		test('single element sets', true, new Set([1]), new Set([1]))
		test('multiple element sets', true, new Set([1, 2, 3]), new Set([1, 2, 3]))
		test('independent order', true, new Set([1, 2, 3]), new Set([3, 1, 2]))

		test('different size', false, new Set([1, 2, 3]), new Set([1, 2]))
		test('different elements', false, new Set([1, 2, 3]), new Set([1, 2, 4]))
	})
})
