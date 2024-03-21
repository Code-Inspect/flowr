import type { RParseRequestFromFile, RParseRequestFromText } from '@eagleoutice/flowr/r-bridge'

/**
 * Statistics on skipped files, the time required, and more.
 *
 * @see extractUsageStatistics
 * @see initialMetaStatistics
 */
export interface MetaStatistics {
	/**
   * The number of requests that were parsed successfully
   */
	successfulParsed:        number
	/**
   * The processing time for each request
   */
	processingTimeMs:        number[]
	/**
   * All failed requests (e.g., if they can not be converted to XML)
   */
	failedRequests:          (RParseRequestFromText | RParseRequestFromFile)[]
	/**
   * Number of lines with each individual line length consumed for each request
   */
	lines:                   number[][]
	/**
	 * The number of nodes in the normalized AST
	 */
	numberOfNormalizedNodes: number[]
}

/**
 * Returns an initial {@link MetaStatistics} object, using neutral defaults (like the empty list).
 */
export function initialMetaStatistics(): MetaStatistics {
	return {
		successfulParsed:        0,
		numberOfNormalizedNodes: [],
		processingTimeMs:        [],
		failedRequests:          [],
		lines:                   []
	}
}
