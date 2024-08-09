import type { SingleSlicingCriterion, SlicingCriteria } from '../../slicing/criterion/parse'
import type { NodeId } from '../../r-bridge/lang-4.x/ast/model/processing/node-id'
import type { ReconstructionResult } from '../../reconstruct/reconstruct'
import type { RParseRequestFromFile, RParseRequestFromText } from '../../r-bridge/retriever'
import type { TimePerToken } from '../summarizer/data'
import type { MergeableRecord } from '../../util/objects'

export const CommonSlicerMeasurements = ['initialize R session', 'retrieve AST from R code', 'normalize R AST', 'produce dataflow information', 'close R session', 'total'] as const
export type CommonSlicerMeasurements = typeof CommonSlicerMeasurements[number]

export const PerSliceMeasurements = ['static slicing', 'reconstruct code', 'total'] as const
export type PerSliceMeasurements = typeof PerSliceMeasurements[number]

export type ElapsedTime = bigint

export interface PerSliceStats {
	measurements:                Map<PerSliceMeasurements, ElapsedTime>
	slicingCriteria:             { criterion: SingleSlicingCriterion, id: NodeId }[]
	reconstructedCode:           ReconstructionResult
	numberOfDataflowNodesSliced: number
	timesHitThreshold:           number
}

export interface SlicerStatsInput<T = number> {
	numberOfLines:                             T
	numberOfNonEmptyLines:                     T
	numberOfCharacters:                        T
	numberOfCharactersNoComments:              T
	numberOfNonWhitespaceCharacters:           T
	numberOfNonWhitespaceCharactersNoComments: T
	numberOfRTokens:                           T
	numberOfRTokensNoComments:                 T
	numberOfNormalizedTokens:                  T
	numberOfNormalizedTokensNoComments:        T
}


export interface SlicerStatsDataflow<T = number> {
	numberOfNodes:               T
	numberOfEdges:               T
	numberOfCalls:               T
	numberOfFunctionDefinitions: T
	/* size of object in bytes as measured by v8 serialization */
	sizeOfObject:                T
}


/**
 * Please note, that these measurement can be negative as there is no guarantee that the memory usage will increase
 * due to, e.g., garbage collection.
*/
export interface BenchmarkMemoryMeasurement<T = number> extends MergeableRecord {
	/* used heap memory delta as reported by the node process in bytes */
	heap:     T
	/* resident set size delta as reported by the node process in bytes */
	rss:      T
	/* external memory delta as reported by the node process in bytes */
	external: T
	/* (array) buffer memory delta as reported by the node process in bytes */
	buffs:    T
}

/**
 * The statistics that are collected by the {@link BenchmarkSlicer} and used for benchmarking.
 */
export interface SlicerStats {
	commonMeasurements:      Map<CommonSlicerMeasurements, ElapsedTime>
	perSliceMeasurements:    Map<SlicingCriteria, PerSliceStats>
	memory:                  Map<CommonSlicerMeasurements, BenchmarkMemoryMeasurement>,
	request:                 RParseRequestFromFile | RParseRequestFromText
	input:                   SlicerStatsInput
	dataflow:                SlicerStatsDataflow
	retrieveTimePerToken:    TimePerToken<number>
	normalizeTimePerToken:   TimePerToken<number>
	dataflowTimePerToken:    TimePerToken<number>
	totalCommonTimePerToken: TimePerToken<number>
}
