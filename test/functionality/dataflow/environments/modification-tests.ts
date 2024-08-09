import { guard } from '../../../../src/util/assert'
import { expect } from 'chai'
import { defaultEnv } from '../../_helper/dataflow/environment-builder'
import { label } from '../../_helper/label'
import type { NodeId } from '../../../../src/r-bridge/lang-4.x/ast/model/processing/node-id'
import type { IEnvironment } from '../../../../src/dataflow/environments/environment'
import { overwriteEnvironment } from '../../../../src/dataflow/environments/overwrite'
import { appendEnvironment } from '../../../../src/dataflow/environments/append'

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
		it(label('Different variables', ['global-scope', 'name-normal'], ['other']), () => {
			const clean = defaultEnv().defineVariable('x', '_1')
			const overwrite = defaultEnv().defineVariable('y', '_2')
			const result = overwriteEnvironment(clean, overwrite)
			expect(result, 'there should be a result').to.be.not.undefined
			expect(result.current.memory, 'there should be two definitions for x and y').to.have.length(2)
			existsDefinedAt('x', ['_1'], result.current, 'globals must be defined locally as well')
			existsDefinedAt('y', ['_2'], result.current, 'globals must be defined locally as well')
		})

		it(label('Same variables', ['global-scope'], ['other']), () => {
			const clean = defaultEnv().defineVariable('x', '_1')
			const overwrite = defaultEnv().defineVariable('x', '_2')
			const result = overwriteEnvironment(clean, overwrite)
			expect(result, 'there should be a result').to.be.not.undefined
			expect(result.current.memory, 'there should be only one definition for x').to.have.length(1)
			existsDefinedAt('x', ['_2'], result.current)
		})
	})

	describe('Local', () => {

		it(label('Different variables', ['lexicographic-scope'], ['other']), () => {
			const clean = defaultEnv().defineVariable('long', '_1')
			const overwrite = defaultEnv().defineVariable('short', '_2')
			const result = overwriteEnvironment(clean, overwrite)
			expect(result, 'there should be a result').to.be.not.undefined
			expect(result.level, 'neither definitions nor overwrites should produce new local scopes').to.be.equal(0)
			expect(result.current.memory, 'there should be two definitions for long and short').to.have.length(2)
			existsDefinedAt('long', ['_1'], result.current)
			existsDefinedAt('short', ['_2'], result.current)
		})

		it(label('Same variables', ['lexicographic-scope'], ['other']), () => {
			const clean = defaultEnv().defineVariable('long', '_1')
			const overwrite = defaultEnv().defineVariable('long', '_2')
			const result = overwriteEnvironment(clean, overwrite)
			expect(result, 'there should be a result').to.be.not.undefined
			expect(result.level, 'neither definitions nor overwrites should produce new local scopes').to.be.equal(0)
			expect(result.current.memory, 'there should be only one definition for long').to.have.length(1)
			existsDefinedAt('long', ['_2'], result.current)
		})
	})
})

describe('Append', () => {
	describe('Global', () => {
		it(label('Different variables', ['global-scope', 'lexicographic-scope'], ['other']), () => {
			const clean = defaultEnv().defineVariable('x', '_1', '_1')
			const append = defaultEnv().defineVariable('y', '_2', '_2')
			const result = appendEnvironment(clean, append)
			expect(result, 'there should be a result').to.be.not.undefined
			expect(result.current.memory, 'there should be two definitions for x and y').to.have.length(2)
			existsDefinedAt('x', ['_1'], result.current, 'globals must be defined locally as well')
			existsDefinedAt('y', ['_2'], result.current, 'globals must be defined locally as well')
		})

		it(label('Same variables', ['global-scope', 'lexicographic-scope'], ['other']), () => {
			const clean = defaultEnv().defineVariable('x', '_1', '_1')
			const append = defaultEnv().defineVariable('x', '_2', '_2')
			const result = appendEnvironment(clean, append)
			expect(result, 'there should be a result').to.be.not.undefined
			expect(result.current.memory, 'there should be only one symbol defined (for x)').to.have.length(1)
			existsDefinedAt('x', ['_1', '_2'], result.current)
		})
	})

	describe('Local', () => {

		it(label('Different variables', ['lexicographic-scope'], ['other']), () => {
			const clean = defaultEnv().defineVariable('local-long', '_1')
			const append = defaultEnv().defineVariable('local-short', '_2')
			const result = appendEnvironment(clean, append)
			expect(result, 'there should be a result').to.be.not.undefined
			expect(result.level, 'neither definitions nor appends should produce new local scopes').to.be.equal(0)
			expect(result.current.memory, 'there should be two definitions for local-long and local-short').to.have.length(2)
			existsDefinedAt('local-long', ['_1'], result.current)
			existsDefinedAt('local-short', ['_2'], result.current)
		})

		it(label('Same variables', ['lexicographic-scope'], ['other']), () => {
			const clean = defaultEnv().defineVariable('local-long', '_1')
			const append = defaultEnv().defineVariable('local-long', '_2')
			const result = appendEnvironment(clean, append)
			expect(result, 'there should be a result').to.be.not.undefined
			expect(result.level, 'neither definitions nor overwrites should produce new local scopes').to.be.equal(0)
			expect(result.current.memory, 'there should be only one definition for local-long').to.have.length(1)
			existsDefinedAt('local-long', ['_1', '_2'], result.current)
		})
	})
})
