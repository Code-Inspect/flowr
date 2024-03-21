import type { NodeId } from '../../../../src/r-bridge'
import type { IEnvironment } from '../../../../src/dataflow'
import { DefaultEnvironmentMemory } from '../../../../src/dataflow'
import { guard } from '../../../../src/util/assert'
import { expect } from 'chai'
import { appendEnvironments, overwriteEnvironments } from '../../../../src/dataflow/environments'
import { GlobalScope, } from '../../../../src/dataflow/environments/scopes'
import { defaultEnvironment } from '../../_helper/environment-builder'

/** if you pass multiple `definedAt`, this will expect the node to have multiple definitions */
function existsDefinedAt(name: string, definedAt: NodeId[], result: IEnvironment | undefined, message?: string) {
	if(result === undefined) {
		expect.fail('there should be a result')
	}
	const got = result.memory.get(name)
	guard(got !== undefined, `${name} should exist. ${message ?? ''}`)
	expect(got, `${name} should have one possible definition per defined at (${JSON.stringify(definedAt)}). ${message ?? ''}`).to.have.length(definedAt.length)
	expect(got.map(d => d.definedAt), `${name} should be defined at ${JSON.stringify(definedAt)}. ${message ?? ''}`).to.deep.equal(definedAt)
}

describe('Modification', () => {
	describe('Global', () => {
		it('Different variables', () => {
			const clean = defaultEnvironment().defineVariable('x', '_1')
			const overwrite = defaultEnvironment().defineVariable('y', '_2')
			const result = overwriteEnvironments(clean, overwrite)
			expect(result, 'there should be a result').to.be.not.undefined
			expect(result.current.memory, 'there should be two definitions for x and y').to.have.length(2 + DefaultEnvironmentMemory.size)
			existsDefinedAt('x', ['_1'], result.current, 'globals must be defined locally as well')
			existsDefinedAt('y', ['_2'], result.current, 'globals must be defined locally as well')
		})

		it('Same variables', () => {
			const clean = defaultEnvironment().defineVariable('x', '_1')
			const overwrite = defaultEnvironment().defineVariable('x', '_2')
			const result = overwriteEnvironments(clean, overwrite)
			expect(result, 'there should be a result').to.be.not.undefined
			expect(result.current.memory, 'there should be only one definition for x').to.have.length(1 + DefaultEnvironmentMemory.size)
			existsDefinedAt('x', ['_2'], result.current)
		})
	})

	describe('Local', () => {
		it('Different variables', () => {
			const clean = defaultEnvironment().defineVariable('long', '_1')
			const overwrite = defaultEnvironment().defineVariable('short', '_2')
			const result = overwriteEnvironments(clean, overwrite)
			expect(result, 'there should be a result').to.be.not.undefined
			expect(result.level, 'neither definitions nor overwrites should produce new local scopes').to.be.equal(0)
			expect(result.current.memory, 'there should be two definitions for long and short').to.have.length(2 + DefaultEnvironmentMemory.size)
			existsDefinedAt('long', ['_1'], result.current)
			existsDefinedAt('short', ['_2'], result.current)
		})

		it('Same variables', () => {
			const clean = defaultEnvironment().defineVariable('long', '_1')
			const overwrite = defaultEnvironment().defineVariable('long', '_2')
			const result = overwriteEnvironments(clean, overwrite)
			expect(result, 'there should be a result').to.be.not.undefined
			expect(result.level, 'neither definitions nor overwrites should produce new local scopes').to.be.equal(0)
			expect(result.current.memory, 'there should be only one definition for long').to.have.length(1 + DefaultEnvironmentMemory.size)
			existsDefinedAt('long', ['_2'], result.current)
		})
	})
})

describe('Append', () => {
	describe('Global', () => {
		it('Different variables', () => {
			const clean = defaultEnvironment().defineVariable('x', '_1', '_1',  GlobalScope)
			const append = defaultEnvironment().defineVariable('y', '_2', '_2',  GlobalScope)
			const result = appendEnvironments(clean, append)
			expect(result, 'there should be a result').to.be.not.undefined
			expect(result.current.memory, 'there should be two definitions for x and y').to.have.length(2 + DefaultEnvironmentMemory.size)
			existsDefinedAt('x', ['_1'], result.current, 'globals must be defined locally as well')
			existsDefinedAt('y', ['_2'], result.current, 'globals must be defined locally as well')
		})

		it('Same variables', () => {
			const clean = defaultEnvironment().defineVariable('x', '_1', '_1',  GlobalScope)
			const append = defaultEnvironment().defineVariable('x', '_2', '_2',  GlobalScope)
			const result = appendEnvironments(clean, append)
			expect(result, 'there should be a result').to.be.not.undefined
			expect(result.current.memory, 'there should be only one symbol defined (for x)').to.have.length(1 + DefaultEnvironmentMemory.size)
			existsDefinedAt('x', ['_1', '_2'], result.current)
		})
	})

	describe('Local', () => {
		it('Different variables', () => {
			const clean = defaultEnvironment().defineVariable('local-long', '_1')
			const append = defaultEnvironment().defineVariable('local-short', '_2')
			const result = appendEnvironments(clean, append)
			expect(result, 'there should be a result').to.be.not.undefined
			expect(result.level, 'neither definitions nor appends should produce new local scopes').to.be.equal(0)
			expect(result.current.memory, 'there should be two definitions for local-long and local-short').to.have.length(2 + DefaultEnvironmentMemory.size)
			existsDefinedAt('local-long', ['_1'], result.current)
			existsDefinedAt('local-short', ['_2'], result.current)
		})

		it('Same variables', () => {
			const clean = defaultEnvironment().defineVariable('local-long', '_1')
			const append = defaultEnvironment().defineVariable('local-long', '_2')
			const result = appendEnvironments(clean, append)
			expect(result, 'there should be a result').to.be.not.undefined
			expect(result.level, 'neither definitions nor overwrites should produce new local scopes').to.be.equal(0)
			expect(result.current.memory, 'there should be only one definition for local-long').to.have.length(1 + DefaultEnvironmentMemory.size)
			existsDefinedAt('local-long', ['_1', '_2'], result.current)
		})
	})
})
