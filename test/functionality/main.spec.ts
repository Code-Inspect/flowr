/**
 * We use this file to configure the logging used when running tests
 *
 * @module
 */

import { LogLevel } from '../../src/util/log'
import chai from 'chai'
import { setMinLevelOfAllLogs } from './_helper/log'

chai.config.includeStack = true
chai.config.showDiff = true
chai.config.truncateThreshold = 0

export const VERBOSE_TESTS = process.argv.includes('--verbose')
before(() => setMinLevelOfAllLogs(VERBOSE_TESTS ? LogLevel.Trace : LogLevel.Error, VERBOSE_TESTS))

/** controlled with the `--test-installation` parameter */
export const RUN_INSTALLATION_TESTS = process.argv.includes('--test-installation')

export function isInstallTest(test: Mocha.Context): void {
	if(!RUN_INSTALLATION_TESTS) {
		console.warn('skipping installation test (set RUN_INSTALLATION_TESTS to run it)')
		test.skip()
	}
}
