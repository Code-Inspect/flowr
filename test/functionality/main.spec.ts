/**
 * We use this file to configure the logging used when running tests
 *
 * @module
 */

import { log, LogLevel } from '../../src/util/log'
import { serverLog } from '../../src/cli/repl/server/server'

/**
 * Update the minimum level of all flowr loggers (including the detached {@link serverLog}).
 * @param minLevel - The new minimum level to show messages from (inclusive)
 * @param log2File - Whether to log to a file as well
 */
export function setMinLevelOfAllLogs(minLevel: LogLevel, log2File = false) {
	for(const logger of [log, serverLog]) {
		if(log2File) {
			logger.logToFile()
		}
		logger.updateSettings(logger => {
			logger.settings.minLevel = minLevel
		})
	}
}


export const VERBOSE_TESTS = process.argv.includes('--verbose')


// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
export const mochaGlobalSetup = () => {
	setMinLevelOfAllLogs(VERBOSE_TESTS ? LogLevel.Trace : LogLevel.Error, VERBOSE_TESTS)
}
mochaGlobalSetup()


/** controlled with the `--test-installation` parameter */
export const RUN_INSTALLATION_TESTS = process.argv.includes('--test-installation')

export function isInstallTest(test: Mocha.Context): void {
	if(!RUN_INSTALLATION_TESTS) {
		console.warn('skipping installation test (set RUN_INSTALLATION_TESTS to run it)')
		test.skip()
	}
}
