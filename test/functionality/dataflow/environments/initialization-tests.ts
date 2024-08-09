import { expect } from 'chai'
import { label } from '../../_helper/label'
import {
	BuiltInEnvironment,
	Environment,
	initializeCleanEnvironments
} from '../../../../src/dataflow/environments/environment'

describe('Initialization', () => {
	it(label('Clean creation should have no info but the default information', ['global-scope'], ['other']), () => {
		const clean = initializeCleanEnvironments()
		expect(clean.current,'there should be a current environment').to.be.not.undefined
		expect(clean.current.memory.size, 'the current environment should have no memory').to.be.equal(0)
		expect(clean.level, 'the level of the clean environment is predefined as 0').to.be.equal(0)
	})
	it(label('Clean creation should create independent new environments', ['lexicographic-scope'], ['other']), () => {
		const clean = initializeCleanEnvironments()
		clean.current.parent = new Environment(clean.current.parent)

		const second = initializeCleanEnvironments()
		expect(second.current.parent.id, 'the new one should have a parent, the built-in environment').to.be.equal(BuiltInEnvironment.id)
		expect(clean.current.parent, 'the old one should still have the parent').to.be.not.undefined
	})
})
