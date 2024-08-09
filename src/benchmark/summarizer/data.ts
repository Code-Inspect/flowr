import type { SummarizedMeasurement } from '../../util/summarizer'
import type {
	CommonSlicerMeasurements,
	PerSliceMeasurements,
	SlicerStats,
	SlicerStatsDataflow,
	SlicerStatsInput
} from '../stats/stats'


export interface SliceSizeCollection {
	lines:                             number[]
	nonEmptyLines:                     number[]
	characters:                        number[]
	charactersNoComments:              number[]
	nonWhitespaceCharacters:           number[]
	nonWhitespaceCharactersNoComments: number[]
	/** like library statements during reconstruction */
	linesWithAutoSelected:             number[]
	dataflowNodes:                     number[]
	tokens:                            number[]
	tokensNoComments:                  number[]
	normalizedTokens:                  number[]
	normalizedTokensNoComments:        number[]
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

export interface TimePerToken<T = SummarizedMeasurement> {
	raw:        T,
	normalized: T
}

export interface SummarizedPerSliceStats {
	/** number of total slicing calls */
	numberOfSlices:            number
	/** statistics on the used slicing criteria (number of ids within criteria etc.) */
	sliceCriteriaSizes:        SummarizedMeasurement
	measurements:              Map<PerSliceMeasurements, SummarizedMeasurement>
	sliceTimePerToken:         TimePerToken
	reconstructTimePerToken:   TimePerToken
	totalPerSliceTimePerToken: TimePerToken
	reduction:                 Reduction<SummarizedMeasurement>
	/** reduction, but without taking into account comments and empty lines */
	reductionNoFluff:          Reduction<SummarizedMeasurement>
	failedToRepParse:          number
	timesHitThreshold:         number
	sliceSize: {
		[K in keyof SliceSizeCollection]: SummarizedMeasurement
	}
}

export interface UltimateSlicerStats {
	totalRequests:             number
	totalSlices:               number
	commonMeasurements:        Map<CommonSlicerMeasurements, SummarizedMeasurement>
	perSliceMeasurements:      Map<PerSliceMeasurements, SummarizedMeasurement>
	retrieveTimePerToken:      TimePerToken
	normalizeTimePerToken:     TimePerToken
	dataflowTimePerToken:      TimePerToken
	totalCommonTimePerToken:   TimePerToken
	sliceTimePerToken:         TimePerToken
	reconstructTimePerToken:   TimePerToken
	totalPerSliceTimePerToken: TimePerToken
	/** sum */
	failedToRepParse:          number
	/** sum */
	timesHitThreshold:         number
	reduction:                 Reduction<SummarizedMeasurement>
	/** reduction, but without taking into account comments and empty lines */
	reductionNoFluff:          Reduction<SummarizedMeasurement>
	input:                     SlicerStatsInput<SummarizedMeasurement>
	dataflow:                  SlicerStatsDataflow<SummarizedMeasurement>
}
