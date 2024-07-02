import { guard } from '../../../src/util/assert'
import { assert } from 'chai'
import semver from 'semver/preload'
import { RShellExecutor } from '../../../src/r-bridge/shell-executor'

describe('RShellExecutor', function() {
	it('R version', () => {
		const version = new RShellExecutor().usedRVersion()
		guard(version !== null, 'we should be able to retrieve the version of R')
		assert.isNotNull(semver.valid(version), `the version ${JSON.stringify(version)} should be a valid semver`)
		assert.isTrue(semver.gt(version, '0.0.0'), `the version ${JSON.stringify(version)} should not be 0.0.0`)
	})

	it('ignore errors', () => {
		const executor = new RShellExecutor()
			.addPrerequisites('options(warn=-1); invisible(Sys.setlocale("LC_MESSAGES", \'en_GB.UTF-8\'))')

		// check regular result when an error occurs
		const error = executor.run('a', true)
		assert.match(error, /Error.*'a'/g)
		assert.match(error, /halted/g)
	})
})
