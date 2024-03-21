import { resolveByName } from '../../../../src/dataflow/environments'
import { expect } from 'chai'
import { guard } from '../../../../src/util/assert'
import { GlobalScope, LocalScope } from '../../../../src/dataflow/environments/scopes'
import { defaultEnvironment, variable } from '../../_helper/environment-builder'

describe('Resolve', () => {
	describe('ByName', () => {
		it('Locally without distracting elements', () => {
			const xVar = variable('x', '_1')
			const env = defaultEnvironment().defineEnv(xVar)
			const result = resolveByName('x', LocalScope, env)
			guard(result !== undefined, 'there should be a result')
			expect(result, 'there should be exactly one definition for x').to.have.length(1)
			expect(result[0], 'it should be x').to.be.equal(xVar)
		})
		it('Locally with global distract', () => {
			let env = defaultEnvironment()
				.defineVariable('x', '_2', '_1',  GlobalScope)
			const xVar = variable('x', '_1')
			env = env.defineEnv(xVar)
			const result = resolveByName('x', LocalScope , env)
			guard(result !== undefined, 'there should be a result')
			expect(result, 'there should be exactly one definition for x').to.have.length(1)
			expect(result[0], 'it should be x').to.be.equal(xVar)
		})
	})
})
