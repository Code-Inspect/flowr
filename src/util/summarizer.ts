import type { MergeableRecord } from './objects'
import { sum } from './arrays'

export const enum SummarizerType {
	Benchmark	 = 'benchmark',
	Statistics	 = 'statistics',
}


export interface CommonSummarizerConfiguration extends MergeableRecord{
	logger: (message: string) => void
}

export interface SummarizedMeasurement<T = number> {
	min:    T
	max:    T
	median: T
	/** total may be useless for some measurements, especially if they are weighted before (it is just the sum...)*/
	total:  T
	/** average */
	mean:   number
	/** standard deviation */
	std:    number
}

export abstract class Summarizer<Output, Configuration extends CommonSummarizerConfiguration> {
	protected readonly config: Configuration
	protected readonly log:    CommonSummarizerConfiguration['logger']

	protected constructor(config: Configuration) {
		this.config = config
		this.log = this.config.logger
	}


	/**
	 * First phase of the summary, can be used to extract all data of interest from the individual
	 * benchmark or statistic results. This can write temporary files based on the configuration.
	 *
	 * @param useTypeClassification - Whether to split the analysis based on the detected type (e.g. 'test', 'example', ...)
	 */
	public abstract preparationPhase(useTypeClassification: boolean): Promise<void>

	/**
	 * Second phase of the summary, can be used to combine the data from the first phase
	 * and produce some kind of "ultimate results".
	 */
	public abstract summarizePhase(): Promise<Output>
}

export function summarizedMeasurement2Csv(a: SummarizedMeasurement): string {
	return `${a.min},${a.max},${a.median},${a.mean},${a.std},${a.total}`
}

const summarizedKeys = ['min', 'max', 'median', 'mean', 'std', 'total']
export function summarizedMeasurement2CsvHeader(prefix?: string): string {
	return summarizedKeys.map(k => prefix ? `${prefix}-${k}` : k).join(',')
}

export function summarizeMeasurement(data: number[], totalNumberOfDataPoints?: number): SummarizedMeasurement {
	// just to avoid in-place modification
	const sorted = [...data].sort((a, b) => a - b)
	const min = sorted[0]
	const max = sorted[sorted.length - 1]
	const median = sorted[Math.floor(sorted.length / 2)]
	const total = sum(sorted)
	const length = totalNumberOfDataPoints ?? sorted.length
	const mean = total / length
	// sqrt(sum(x-mean)^2 / n)
	const std = Math.sqrt(sorted.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / length)
	return { min, max, median, mean, std, total }
}
