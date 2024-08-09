/**
 * This module holds the definition of what a {@link Feature} that can be extracted from an R AST is.
 *
 * Furthermore, it contains the definition of all features that are known in {@link ALL_FEATURES}.
 *
 * @module
 */

import type { EvalOptions } from 'xpath-ts2/src/parse-api'
import type { MetaStatistics } from '../meta-statistics'
import type { StatisticsSummarizerConfiguration } from '../summarizer/summarizer'
import type { MergeableRecord } from '../../util/objects'
import type { DataflowInformation } from '../../dataflow/info'
import type { NormalizedAst } from '../../r-bridge/lang-4.x/ast/model/processing/decorate'
import { usedPackages } from './supported/used-packages/used-packages'
import { comments } from './supported/comments/comments'
import { definedFunctions } from './supported/defined-functions/defined-functions'
import { usedFunctions } from './supported/used-functions/used-functions'
import { values } from './supported/values/values'
import { assignments } from './supported/assignments/assignments'
import { loops } from './supported/loops/loops'
import { controlflow } from './supported/control-flow/control-flow'
import { dataAccess } from './supported/data-access/data-access'
import { expressionList } from './supported/expression-list/expression-list'
import { variables } from './supported/variables/variables'

/**
 * Maps each sub-feature name to the number of occurrences of that sub-feature.
 * Allows for one nesting level to denote hierarchical features.
 * <p>
 * Since we are writing to files {@link process}, we only count feature occurrences (some feature/parts are not written to file)
 */
export type FeatureInfo = Record<string, unknown> & MergeableRecord


/**
 * The information and context that a {@link FeatureProcessor} may operate in.
 */
export interface FeatureProcessorInput extends MergeableRecord {
	/** The XML Document representing the parsed (non-normalized) R AST */
	readonly parsedRAst:     Document,
	/** The R AST, after the normalization step */
	readonly normalizedRAst: NormalizedAst,
	/** The dataflow information for the given input */
	readonly dataflow:       DataflowInformation,
	/** The filepath that the document originated from (if present, may be undefined if the input was provided as text). This can be relative to the common root directory of requests. */
	readonly filepath:       string | undefined
}

/**
 * A function that processes the analysis results of a document and returns the feature information.
 */
export type FeatureProcessor<T extends FeatureInfo> = (existing: T, input: FeatureProcessorInput) => T

/**
 * A feature is something to be retrieved by the statistics.
 *
 * @typeParam T - The type of what should be collected for the feature
 *
 * @see ALL_FEATURES
 */
export interface Feature<T extends FeatureInfo> {
	/** A descriptive, yet unique name of the feature */
	readonly name:        string
	/** A description of the feature */
	readonly description: string
	/** A function that retrieves the feature in the document appends it to the existing feature set (we could use a monoid :D), the filepath corresponds to the active file (if any) */
	process:              FeatureProcessor<T>
	/**
	 * If present, this feature allows to post-process the results of the feature extraction (for the summarizer).
	 * <p>
	 * The extraction can use the output path to write files to, and should return the final output.
	 *
	 * @param featureRoot - The root path to the feature directory which should contain all the files the feature can write to (already merged for every file processed)
	 * @param info        - The feature statistic maps each file name/context encountered to the feature information as well as the meta statistics for the file
	 * @param outputPath  - The path to write the output to (besides what is collected in the output and meta information)
	 * @param config      - The configuration for the summarizer (e.g., to obtain the number of folders to skip for the feature root)
	 */
	postProcess?:         (featureRoot: string, info: Map<string, FeatureStatisticsWithMeta>, outputPath: string, config: StatisticsSummarizerConfiguration) => void
	/** Values to start the existing track from */
	initialValue:         T
}

/**
 * The source of truth for all features that are supported by the statistics.
 */
export const ALL_FEATURES = {
	usedPackages:     usedPackages,
	comments:         comments,
	definedFunctions: definedFunctions,
	usedFunctions:    usedFunctions,
	values:           values,
	assignments:      assignments,
	loops:            loops,
	controlflow:      controlflow,
	dataAccess:       dataAccess,
	expressionList:   expressionList,
	variables:        variables
} as const

export type FeatureKey = keyof typeof ALL_FEATURES
export type FeatureValue<K extends FeatureKey> = ReturnType<typeof ALL_FEATURES[K]['process']>

/** If the user passes `all`, this should be every feature present in {@link ALL_FEATURES} (see {@link allFeatureNames})*/
export type FeatureSelection = Set<FeatureKey>

export const allFeatureNames: Set<FeatureKey> = new Set<FeatureKey>(Object.keys(ALL_FEATURES) as FeatureKey[])

export type FeatureStatistics = {
	[K in FeatureKey]: FeatureInfo
}

export type FeatureStatisticsWithMeta = FeatureStatistics & { stats: MetaStatistics }

export interface Query { select(options?: EvalOptions): Node[] }
