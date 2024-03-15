/**
 * This module is tasked with processing the results of the benchmarking (see {@link SummarizedSlicerStats}).
 * @module
 */
import { guard } from '../../util/assert'
import type { ElapsedTime, PerSliceMeasurements } from './stats'
import type {
	SummarizedMeasurement,
	SummarizedPerSliceStats,
	SummarizedSlicerStats,
	UltimateSlicerStats
} from '../../util/summarizer/benchmark/data'

const padSize = 15

function pad<T>(string: T) {
	return String(string).padStart(padSize, ' ')
}

function divWithRest(dividend: bigint, divisor: bigint): [bigint, bigint] {
	return [dividend / divisor, dividend % divisor]
}

function formatNanoseconds(nanoseconds: bigint | number): string {
	if(nanoseconds < 0) {
		return '??'
	}
	const [seconds, rest] = divWithRest(typeof nanoseconds === 'number' ? BigInt(Math.round(nanoseconds)) : nanoseconds, BigInt(1e9))
	const [milliseconds, remainingNanoseconds] = divWithRest(rest, BigInt(1e6))

	const secondsStr= seconds > 0 ? `${String(seconds).padStart(2, '0')}.` : ''
	const millisecondsStr = seconds > 0 ? `${String(milliseconds).padStart(3, '0')}:` : `${String(milliseconds)}:`
	const nanoStr = String(remainingNanoseconds).padEnd(3, '0').substring(0, 3)
	const unit = seconds === 0n ? 'ms' : ' s' /* space for padding */
	return pad(`${secondsStr}${millisecondsStr}${nanoStr}${unit}`)
}


function print<K>(measurements: Map<K, ElapsedTime>, key: K) {
	const time = measurements.get(key)
	guard(time !== undefined, () => `Measurement for ${JSON.stringify(key)} not found`)
	return formatNanoseconds(time)
}

function formatSummarizedTimeMeasure(measure: SummarizedMeasurement | undefined) {
	if(measure === undefined) {
		return '??'
	}
	return `${formatNanoseconds(measure.min)} - ${formatNanoseconds(measure.max)} (median: ${formatNanoseconds(measure.median)}, mean: ${formatNanoseconds(measure.mean)}, std: ${formatNanoseconds(measure.std)})`
}

function roundTo(num: number, digits = 4): number {
	const factor = Math.pow(10, digits)
	return Math.round(num * factor) / factor
}

function asPercentage(num: number): string {
	if(isNaN(num)) {
		return '??%'
	}
	return pad(`${roundTo(num * 100, 3)}%`)
}

function asFloat(num: number): string {
	return pad(roundTo(num))
}

function formatSummarizedMeasure(measure: SummarizedMeasurement | undefined, fmt: (num: number) => string = asFloat) {
	if(measure === undefined) {
		return '??'
	}
	return `${fmt(measure.min)} - ${fmt(measure.max)} (median: ${fmt(measure.median)}, mean: ${fmt(measure.mean)}, std: ${fmt(measure.std)})`
}

function printSummarizedMeasurements(stats: SummarizedPerSliceStats, key: PerSliceMeasurements): string {
	const measure = stats.measurements.get(key)
	guard(measure !== undefined, () => `Measurement for ${JSON.stringify(key)} not found`)
	return formatSummarizedTimeMeasure(measure)
}

function printCountSummarizedMeasurements(stats: SummarizedMeasurement): string {
	const range = `${stats.min} - ${stats.max}`.padStart(padSize, ' ')
	return `${range} (median: ${stats.median}, mean: ${stats.mean}, std: ${stats.std})`
}

/**
 * Converts the given stats to a human-readable string.
 * You may have to {@link summarizeSlicerStats|summarize} the stats first.
 */
export function stats2string(stats: SummarizedSlicerStats): string {
	let result = `
Request: ${JSON.stringify(stats.request)}
Shell init time:              ${print(stats.commonMeasurements,'initialize R session')}
AST retrieval:                ${print(stats.commonMeasurements,'retrieve AST from R code')}
AST normalization:            ${print(stats.commonMeasurements,'normalize R AST')}
Dataflow creation:            ${print(stats.commonMeasurements,'produce dataflow information')}

Slicing summary for ${stats.perSliceMeasurements.numberOfSlices} slice${stats.perSliceMeasurements.numberOfSlices !== 1 ? 's' : ''}:`
	if(stats.perSliceMeasurements.numberOfSlices > 0) {
		result += `
  Total:                      ${printSummarizedMeasurements(stats.perSliceMeasurements, 'total')}
  Slice creation:             ${printSummarizedMeasurements(stats.perSliceMeasurements, 'static slicing')}
  Reconstruction:             ${printSummarizedMeasurements(stats.perSliceMeasurements, 'reconstruct code')}
  Used Slice Criteria Sizes:  ${printCountSummarizedMeasurements(stats.perSliceMeasurements.sliceCriteriaSizes)}
  Result Slice Sizes:   
    Number of lines:                     ${printCountSummarizedMeasurements(stats.perSliceMeasurements.sliceSize.lines)}
    Number of characters:                ${printCountSummarizedMeasurements(stats.perSliceMeasurements.sliceSize.characters)}
    Number of non whitespace characters: ${printCountSummarizedMeasurements(stats.perSliceMeasurements.sliceSize.nonWhitespaceCharacters)}
    Number of auto selected:             ${printCountSummarizedMeasurements(stats.perSliceMeasurements.sliceSize.autoSelected)}
    Number of R tokens:                  ${printCountSummarizedMeasurements(stats.perSliceMeasurements.sliceSize.tokens)}
    Normalized R tokens:                 ${printCountSummarizedMeasurements(stats.perSliceMeasurements.sliceSize.normalizedTokens)}
    Number of dataflow nodes:            ${printCountSummarizedMeasurements(stats.perSliceMeasurements.sliceSize.dataflowNodes)}
`
	}

	return `${result}
Shell close:                  ${print(stats.commonMeasurements, 'close R session')}
Total:                        ${print(stats.commonMeasurements, 'total')}

Input:
  Number of lines:                     ${pad(stats.input.numberOfLines)}
  Number of characters:                ${pad(stats.input.numberOfCharacters)}
  Number of non whitespace characters: ${pad(stats.input.numberOfNonWhitespaceCharacters)}
  Number of tokens:                    ${pad(stats.input.numberOfRTokens)}
  Normalized R tokens:                 ${pad(stats.input.numberOfNormalizedTokens)}

Dataflow:
  Number of nodes:            ${pad(stats.dataflow.numberOfNodes)}
  Number of edges:            ${pad(stats.dataflow.numberOfEdges)}
  Number of calls:            ${pad(stats.dataflow.numberOfCalls)}
  Number of function defs:    ${pad(stats.dataflow.numberOfFunctionDefinitions)}`
}

export function ultimateStats2String(stats: UltimateSlicerStats): string {
	// Used Slice Criteria Sizes:  ${formatSummarizedMeasure(stats.perSliceMeasurements.sliceCriteriaSizes)}
	return `
Summarized: ${stats.totalRequests} requests and ${stats.totalSlices} slices
Shell init time:              ${formatSummarizedTimeMeasure(stats.commonMeasurements.get('initialize R session'))}
AST retrieval:                ${formatSummarizedTimeMeasure(stats.commonMeasurements.get('retrieve AST from R code'))}
AST normalization:            ${formatSummarizedTimeMeasure(stats.commonMeasurements.get('normalize R AST'))}
Dataflow creation:            ${formatSummarizedTimeMeasure(stats.commonMeasurements.get('produce dataflow information'))}

Slice summary for:
  Total:                      ${formatSummarizedTimeMeasure(stats.perSliceMeasurements.get('total'))}
  Slice creation:             ${formatSummarizedTimeMeasure(stats.perSliceMeasurements.get('static slicing'))}
  Reconstruction:             ${formatSummarizedTimeMeasure(stats.perSliceMeasurements.get('reconstruct code'))}
  Failed to Re-Parse:         ${pad(stats.failedToRepParse)}/${stats.totalSlices}
  Times hit Threshold:        ${pad(stats.timesHitThreshold)}/${stats.totalSlices} 
  Reductions (reduced by x%):   
    Number of lines:                     ${formatSummarizedMeasure(stats.reduction.numberOfLines, asPercentage)}
    Number of lines no auto:             ${formatSummarizedMeasure(stats.reduction.numberOfLinesNoAutoSelection, asPercentage)}
    Number of characters:                ${formatSummarizedMeasure(stats.reduction.numberOfCharacters, asPercentage)}
    Number of non whitespace characters: ${formatSummarizedMeasure(stats.reduction.numberOfNonWhitespaceCharacters, asPercentage)}
    Number of R tokens:                  ${formatSummarizedMeasure(stats.reduction.numberOfRTokens, asPercentage)}
    Normalized R tokens:                 ${formatSummarizedMeasure(stats.reduction.numberOfNormalizedTokens, asPercentage)}
    Number of dataflow nodes:            ${formatSummarizedMeasure(stats.reduction.numberOfDataflowNodes, asPercentage)}

Shell close:                  ${formatSummarizedTimeMeasure(stats.commonMeasurements.get('close R session'))}
Total:                        ${formatSummarizedTimeMeasure(stats.commonMeasurements.get('total'))}

Input:
  Number of lines:                     ${formatSummarizedMeasure(stats.input.numberOfLines)}
  Number of characters:                ${formatSummarizedMeasure(stats.input.numberOfCharacters)}
  Number of non whitespace characters: ${formatSummarizedMeasure(stats.input.numberOfNonWhitespaceCharacters)}
  Number of tokens:                    ${formatSummarizedMeasure(stats.input.numberOfRTokens)}
  Normalized R tokens:                 ${formatSummarizedMeasure(stats.input.numberOfNormalizedTokens)}

Dataflow:
  Number of nodes:            ${formatSummarizedMeasure(stats.dataflow.numberOfNodes)}
  Number of edges:            ${formatSummarizedMeasure(stats.dataflow.numberOfEdges)}
  Number of calls:            ${formatSummarizedMeasure(stats.dataflow.numberOfCalls)}
  Number of function defs:    ${formatSummarizedMeasure(stats.dataflow.numberOfFunctionDefinitions)}`
}
