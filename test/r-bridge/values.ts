import { it } from 'mocha'
import { assert } from 'chai'
import { boolean2ts, isBoolean, number2ts, ts2r } from '../../src/r-bridge/lang/values'
import { RNumberPool } from './helper/provider'

describe('Bidirectional Value Translation', () => {
  describe('TS value to R', () => {
    it('undefined', () => {
      assert.equal(ts2r(undefined), 'NA')
    })
    it('null', () => {
      assert.equal(ts2r(null), 'NULL')
    })
    it('booleans', () => {
      assert.equal(ts2r(true), 'TRUE')
      assert.equal(ts2r(false), 'FALSE')
    })
    it('numbers', () => {
      assert.equal(ts2r(1), '1')
      assert.equal(ts2r(1.1), '1.1')
    })
    it('strings', () => {
      assert.equal(ts2r(''), '""', 'empty string')
      assert.equal(ts2r('abc'), '"abc"')
    })
    it('arrays', () => {
      assert.equal(ts2r([]), 'c()', 'empty array')
      assert.equal(ts2r([1, 2, 3]), 'c(1, 2, 3)')
    })
    it('objects', () => {
      assert.equal(ts2r({}), 'list()', 'empty object')
      assert.equal(ts2r({ a: 1, b: 2 }), 'list(a = 1, b = 2)')
      assert.equal(ts2r({ a: 1, b: { c: 2, d: 3 } }), 'list(a = 1, b = list(c = 2, d = 3))')
    })
    it('error for unknown conversions', () => {
      assert.throws(() => ts2r(() => 1), Error, undefined, 'function')
    })
  })
  describe('R value to TS', () => {
    describe('booleans', () => {
      describe('isBoolean', () => {
        it('identify booleans', () => {
          assert.isTrue(isBoolean('TRUE'))
          assert.isTrue(isBoolean('FALSE'))
        })
        it('reject lowercase variants', () => {
          // R is case-sensitive
          assert.isFalse(isBoolean('true'))
          assert.isFalse(isBoolean('false'))
        })
        it('reject numbers', () => {
          // R is case-sensitive
          assert.isFalse(isBoolean('0'))
          assert.isFalse(isBoolean('1'))
        })
        it('reject others', () => {
          // R is case-sensitive
          assert.isFalse(isBoolean('boolean'))
          assert.isFalse(isBoolean('x'))
        })
      })
      describe('boolean2ts', () => {
        it('convert positive', () => {
          assert.isTrue(boolean2ts('TRUE'))
          assert.isFalse(boolean2ts('FALSE'))
        })
        it('throw for others', () => {
          assert.throw(() => boolean2ts('true'), Error)
          assert.throw(() => boolean2ts('false'), Error)
          assert.throw(() => boolean2ts('0'), Error)
          assert.throw(() => boolean2ts('1'), Error)
          assert.throw(() => boolean2ts('boolean'), Error)
          assert.throw(() => boolean2ts('x'), Error)
        })
      })
    })
    describe('numbers', () => {
      for (const number of RNumberPool) {
        it(`${number.str} => ${number.val.num}`, () => {
          assert.deepEqual(number2ts(number.str), number.val)
        })
      }
    })
  })
})
