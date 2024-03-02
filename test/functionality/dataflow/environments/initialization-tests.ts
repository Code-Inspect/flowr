import { DefaultEnvironmentMemory, Environment, initializeCleanEnvironments } from '../../../../src/dataflow'
import { expect } from 'chai'
import { label } from '../../_helper/label'

describe('Initialization', () => {
	it(label('Clean creation should have no info but the default information', ['global-scope'], ['other']), () => {
		const clean = initializeCleanEnvironments()
		expect(clean.current,'there should be a current environment').to.be.not.undefined
		expect(clean.current.memory, 'the current environment should have the default map').to.be.deep.equal(DefaultEnvironmentMemory)
		expect(clean.current.name, 'the current environment must have the correct scope name').to.be.equal('global')
		expect(clean.level, 'the level of the clean environment is predefined as 0').to.be.equal(0)
	})
	it(label('Clean creation should create independent new environments', ['lexicographic-scope'], ['other']), () => {
		const clean = initializeCleanEnvironments()
		clean.current.parent = new Environment('test')

		const second = initializeCleanEnvironments()
		expect(second.current.parent, 'the new one should not have a parent ').to.be.undefined
		expect(clean.current.parent, 'the old one should still have the parent').to.be.not.undefined
	})
	it(label('The default memory map should be copied', ['global-scope', 'lexicographic-scope'], ['other']), () => {
		const clean = initializeCleanEnvironments()
		clean.current.memory.clear()

		const second = initializeCleanEnvironments()
		expect(second.current.memory, 'the new one should have the default environment map').to.be.deep.equal(DefaultEnvironmentMemory)
		expect(clean.current.memory, 'the cleared one should be empty').to.be.have.length(0)
	})
})
