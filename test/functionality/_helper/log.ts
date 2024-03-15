import { log, LogLevel } from '../../../src/util/log'
import { serverLog } from '../../../src/cli/repl/server/server'

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

/**
 * Just a convenience function to enable all logs.
 */
export function enableLog(minLevel: LogLevel = LogLevel.Trace) {
	// we use a test hook as well to be more flexible
	before(() => setMinLevelOfAllLogs(minLevel, false))
	setMinLevelOfAllLogs(minLevel, false)
}
