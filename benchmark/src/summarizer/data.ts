import type {
	CommonSlicerMeasurements,
	PerSliceMeasurements,
	SlicerStats,
	SlicerStatsDataflow,
	SlicerStatsInput
} from '../stats/stats'
import type { SummarizedMeasurement } from '@eagleoutice/flowr/util/summarizer'


export interface SliceSizeCollection {
	lines:                   number[]
	characters:              number[]
	nonWhitespaceCharacters: number[]
	/** like library statements during reconstruction */
	autoSelected:            number[]
	dataflowNodes:           number[]
	tokens:                  number[]
	normalizedTokens:        number[]
}

/**
 * @see SlicerStats
 * @see summarizeSlicerStats
 */
export type SummarizedSlicerStats = {
	perSliceMeasurements: SummarizedPerSliceStats
} & Omit<SlicerStats, 'perSliceMeasurements'>

export interface Reduction<T = number> {
	numberOfLines:                   T
	numberOfLinesNoAutoSelection:    T
	numberOfCharacters:              T
	numberOfNonWhitespaceCharacters: T
	numberOfRTokens:                 T
	numberOfNormalizedTokens:        T
	numberOfDataflowNodes:           T
}

export interface SummarizedPerSliceStats {
	/** number of total slicing calls */
	numberOfSlices:     number
	/** statistics on the used slicing criteria (number of ids within criteria etc.) */
	sliceCriteriaSizes: SummarizedMeasurement
	measurements:       Map<PerSliceMeasurements, SummarizedMeasurement>
	reduction:          Reduction<SummarizedMeasurement>
	failedToRepParse:   number
	timesHitThreshold:  number
	sliceSize: {
		[K in keyof SliceSizeCollection]: SummarizedMeasurement
	}
}

export interface UltimateSlicerStats {
	totalRequests:        number
	totalSlices:          number
	commonMeasurements:   Map<CommonSlicerMeasurements, SummarizedMeasurement>
	perSliceMeasurements: Map<PerSliceMeasurements, SummarizedMeasurement>
	/** sum */
	failedToRepParse:     number
	/** sum */
	timesHitThreshold:    number
	reduction:            Reduction<SummarizedMeasurement>
	input:                SlicerStatsInput<SummarizedMeasurement>
	dataflow:             SlicerStatsDataflow<SummarizedMeasurement>
}
