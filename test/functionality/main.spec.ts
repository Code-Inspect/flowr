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
