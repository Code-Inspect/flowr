import type { ClusterReport } from './clusterer'
import { DefaultMap } from '@eagleoutice/flowr/util/defaultmap'
import { guard, isNotUndefined } from '@eagleoutice/flowr/util/assert'
import type { Table } from '@eagleoutice/flowr/util/files'
import { BiMap } from '@eagleoutice/flowr/util/bimap'
import fs from 'fs'
import { summarizeMeasurement } from '@eagleoutice/flowr/util/summarizer'

/**
 * A conventional histogram (e.g., created by {@link histogramFromNumbers}).
 * Can be converted to a {@link Table} by {@link histograms2table}.
 * As described in {@link histogramFromNumbers}, there always will be a special bin for minimum.
 */
export interface Histogram {
	/** A name intended for humans to know what the histogram is about. */
	readonly name: string
	/** Values located in each bin */
	bins:          number[]
	/** The configured size of each bin (stored explicitly to avoid semantic confusion with floating point arithmetic/problems with different rounding schemes) */
	binSize:       number
	/** Minimum value encountered (inclusive minimum of the underlying value range) */
	min:           number
	/** Maximum value encountered (inclusive maximum of the underlying value range) */
	max:           number
	/** Average of the included numbers */
	mean:          number
	/** Standard deviation of the included numbers */
	std:           number
	/** Median of the included numbers */
	median:        number
}

/**
 * Produces column-wise histogram-information based on a {@link ClusterReport}.
 *
 * Let's suppose you want histograms for the Assignments feature.
 * By default, for each clustered value, a histogram is produced (can be configured by `filter`).
 *
 * @param report  - The report to collect histogram information from
 * @param binSize - Size of each bin (see {@link histogramFromNumbers} for details on why we do not specify the bin-count)
 * @param relateValuesToNumberOfLines - If true, each value (like `<-` appeared in file 'x' exactly `N` times) will be divided by the number of lines in the file 'x'.
 * @param filter  - If given, only produce histograms for the given values
 */
export function histogramsFromClusters(report: ClusterReport, binSize: number, relateValuesToNumberOfLines: boolean, ...filter: string[]): Histogram[] {
	const contexts = [...report.valueInfoMap.entries()]
	const filenameFromId = new BiMap(report.contextIdMap.entries())

	// first, we collect the number of appearances for each value
	const valueCounts = new DefaultMap<string, number[]>(() => [])

	for(const id of report.contextIdMap.values()) {
		// calculate the number of lines within the file given by the id
		const filename = filenameFromId.getKey(id)
		guard(filename !== undefined, `filename for id ${id} is undefined`)
		const numberOfLines = relateValuesToNumberOfLines ? fs.readFileSync(filename, 'utf-8').split('\n').length : 1

		for(const [value, counts] of contexts) {
			valueCounts.get(value).push(counts.get(id) / numberOfLines)
		}
	}

	return [...valueCounts.entries()].map(([name, counts]) =>
		filter.length === 0 || filter.includes(name) ? histogramFromNumbers(name, binSize, counts) : undefined
	).filter(isNotUndefined)
}

/**
 * Produces a histogram from a list of numbers.
 * Because we need to create several histograms of different datasets and want to compare them, we do not accept the
 * number of bins desired and calculate the bin-size from the data (via `Math.ceil((max - min + 1) / bins)`).
 * Instead, we require the bin-size to be given.
 * There *always* will be an extra bin for the minimum value.
 */
export function histogramFromNumbers(name: string, binSize: number, values: number[]): Histogram {
	guard(binSize > 0, `binSize must be greater than 0, but was ${binSize}`)
	guard(values.length > 0, 'values must not be empty')

	const summarized = summarizeMeasurement(values)

	const numberOfBins = Math.ceil((summarized.max - summarized.min + 1) / binSize) + 1
	const histogram = new Array(numberOfBins).fill(0) as number[]

	for(const v of values) {
		const bin = v === summarized.min ? 0 : Math.floor((v - summarized.min) / binSize) + 1
		histogram[bin]++
	}

	return {
		name: name,
		bins: histogram,
		binSize,
		...summarized
	}
}

/**
 * Takes an array of histograms created by {@link histogramFromNumbers} and produces a CSV table from it.
 * They must have the same bin-size for this function to work.
 *
 * The table has the following columns:
 * - `bin`  - The corresponding bin number
 * - `from` - The exclusive lower bound of the bin
 * - `to`   - The inclusive upper bound of the bin
 * - a column with the name of each histogram, containing its count of values in the corresponding bin
 *
 * @param histograms     - The histogram to convert (assumed to have the same ranges and bins)
 * @param countAsDensity - If true, the count is divided by the total number of values (individually for each histogram, similar to pgfplots `hist/density` option)
 */
export function histograms2table(histograms: Histogram[], countAsDensity = false): Table {
	guard(histograms.length > 0, 'there must be at least one histogram to convert to a table')
	const mostBins = guardForLargestBinSize(histograms)

	const header = ['bin', 'from', 'to', ...histograms.map(h => JSON.stringify(h.name))]

	const sums = histograms.map(h => h.bins.reduce((a, b) => a + b, 0))

	const rows: string[][] = []

	for(let binIndex = 0; binIndex < mostBins; binIndex++) {
		const row = new Array(histograms.length + 3) as string[]
		row[0] = String(binIndex)
		if(binIndex === 0) {
			row[1] = histograms[0].min.toFixed(3)
			row[2] = histograms[0].min.toFixed(3)
		} else {
			row[1] = String((binIndex-1) * histograms[0].binSize + histograms[0].min)
			row[2] = String((binIndex) * histograms[0].binSize + histograms[0].min)
		}
		// fill remaining columns
		writeRoResultsForHistograms(histograms, binIndex, row, countAsDensity, sums)
		rows.push(row)
	}

	return {
		header: header,
		rows:   rows
	}
}

function guardForLargestBinSize(histograms: Histogram[]) {
	const first = histograms[0]
	let mostBins = first.bins.length
	for(let i = 1; i < histograms.length; i++) {
		guard(histograms[i].binSize === first.binSize, `histograms must have the same bin-size, but ${histograms[i].name} has ${histograms[i].binSize} instead of ${first.binSize}`)
		if(histograms[i].bins.length > mostBins) {
			mostBins = histograms[i].bins.length
		}
	}
	return mostBins
}

function writeRoResultsForHistograms(histograms: Histogram[], binIndex: number, row: string[], countAsDensity: boolean, sums: number[]) {
	for(let j = 0; j < histograms.length; j++) {
		const bins = histograms[j].bins
		// does not have to be performant...
		if(binIndex >= bins.length) {
			row[j + 3] = '0' /* in a histogram, 0 is the best default value for bins that are not present -- no value appeared in the corresponding bin */
		} else {
			row[j + 3] = String(countAsDensity ? bins[binIndex] / sums[j] : bins[binIndex])
		}
	}
}
