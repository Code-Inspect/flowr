import type { Reduction, SummarizedSlicerStats, TimePerToken, UltimateSlicerStats } from '../data'
import { summarizeSummarizedReductions, summarizeSummarizedMeasurement, summarizeSummarizedTimePerToken, summarizeTimePerToken } from '../first-phase/process'
import { DefaultMap } from '../../../util/defaultmap'
import type { SummarizedMeasurement } from '../../../util/summarizer'
import { summarizeMeasurement } from '../../../util/summarizer'
import { guard } from '../../../util/assert'
import type {
	BenchmarkMemoryMeasurement,
	SlicerStatsDataflow,
	SlicerStatsInput
} from '../../stats/stats'
import {
	CommonSlicerMeasurements,
	PerSliceMeasurements
} from '../../stats/stats'

export function summarizeAllSummarizedStats(stats: SummarizedSlicerStats[]): UltimateSlicerStats {
	const commonMeasurements = new DefaultMap<CommonSlicerMeasurements, number[]>(() => [])
	const perSliceMeasurements = new DefaultMap<PerSliceMeasurements, SummarizedMeasurement[]>(() => [])
	const sliceTimesPerToken: TimePerToken[] = []
	const reconstructTimesPerToken: TimePerToken[] = []
	const totalPerSliceTimesPerToken: TimePerToken[] = []
	const retrieveTimesPerToken: TimePerToken<number>[] = []
	const normalizeTimesPerToken: TimePerToken<number>[] = []
	const dataflowTimesPerToken: TimePerToken<number>[] = []
	const totalCommonTimesPerToken: TimePerToken<number>[] = []
	const memory = new DefaultMap<CommonSlicerMeasurements, BenchmarkMemoryMeasurement[]>(() => [])
	const reductions: Reduction<SummarizedMeasurement>[] = []
	const reductionsNoFluff: Reduction<SummarizedMeasurement>[] = []
	const inputs: SlicerStatsInput[] = []
	const dataflows: SlicerStatsDataflow[] = []
	let failedToRepParse = 0
	let timesHitThreshold = 0
	let totalSlices = 0

	for(const stat of stats) {
		for(const [k, v] of stat.commonMeasurements) {
			commonMeasurements.get(k).push(Number(v))
		}
		for(const [k, v] of stat.perSliceMeasurements.measurements) {
			perSliceMeasurements.get(k).push(v)
		}
		sliceTimesPerToken.push(stat.perSliceMeasurements.sliceTimePerToken)
		reconstructTimesPerToken.push(stat.perSliceMeasurements.reconstructTimePerToken)
		totalPerSliceTimesPerToken.push(stat.perSliceMeasurements.totalPerSliceTimePerToken)
		retrieveTimesPerToken.push(stat.retrieveTimePerToken)
		normalizeTimesPerToken.push(stat.normalizeTimePerToken)
		dataflowTimesPerToken.push(stat.dataflowTimePerToken)
		totalCommonTimesPerToken.push(stat.totalCommonTimePerToken)
		for(const [k, v] of stat.memory) {
			memory.get(k).push(v)
		}
		reductions.push(stat.perSliceMeasurements.reduction)
		reductionsNoFluff.push(stat.perSliceMeasurements.reductionNoFluff)
		inputs.push(stat.input)
		dataflows.push(stat.dataflow)
		failedToRepParse += stat.perSliceMeasurements.failedToRepParse
		totalSlices += stat.perSliceMeasurements.numberOfSlices
		timesHitThreshold += stat.perSliceMeasurements.timesHitThreshold
	}

	return {
		totalRequests:      stats.length,
		totalSlices:        totalSlices,
		commonMeasurements: new Map(
			[...commonMeasurements.entries()].map(([k, v]) => [k, summarizeMeasurement(v)])
		),
		perSliceMeasurements: new Map(
			[...perSliceMeasurements.entries()].map(([k, v]) => [k, summarizeSummarizedMeasurement(v)])
		),
		sliceTimePerToken:         summarizeSummarizedTimePerToken(sliceTimesPerToken),
		reconstructTimePerToken:   summarizeSummarizedTimePerToken(reconstructTimesPerToken),
		totalPerSliceTimePerToken: summarizeSummarizedTimePerToken(totalPerSliceTimesPerToken),
		retrieveTimePerToken:      summarizeTimePerToken(retrieveTimesPerToken),
		normalizeTimePerToken:     summarizeTimePerToken(normalizeTimesPerToken),
		dataflowTimePerToken:      summarizeTimePerToken(dataflowTimesPerToken),
		totalCommonTimePerToken:   summarizeTimePerToken(totalCommonTimesPerToken),
		failedToRepParse,
		timesHitThreshold,
		reduction:                 summarizeSummarizedReductions(reductions),
		reductionNoFluff:          summarizeSummarizedReductions(reductionsNoFluff),
		input:                     {
			numberOfLines:                             summarizeMeasurement(inputs.map(i => i.numberOfLines)),
			numberOfNonEmptyLines:                     summarizeMeasurement(inputs.map(i => i.numberOfNonEmptyLines)),
			numberOfCharacters:                        summarizeMeasurement(inputs.map(i => i.numberOfCharacters)),
			numberOfCharactersNoComments:              summarizeMeasurement(inputs.map(i => i.numberOfCharactersNoComments)),
			numberOfNonWhitespaceCharacters:           summarizeMeasurement(inputs.map(i => i.numberOfNonWhitespaceCharacters)),
			numberOfNonWhitespaceCharactersNoComments: summarizeMeasurement(inputs.map(i => i.numberOfNonWhitespaceCharactersNoComments)),
			numberOfRTokens:                           summarizeMeasurement(inputs.map(i => i.numberOfRTokens)),
			numberOfRTokensNoComments:                 summarizeMeasurement(inputs.map(i => i.numberOfRTokensNoComments)),
			numberOfNormalizedTokens:                  summarizeMeasurement(inputs.map(i => i.numberOfNormalizedTokens)),
			numberOfNormalizedTokensNoComments:        summarizeMeasurement(inputs.map(i => i.numberOfNormalizedTokensNoComments))
		},
		dataflow: {
			numberOfNodes:               summarizeMeasurement(dataflows.map(d => d.numberOfNodes)),
			numberOfFunctionDefinitions: summarizeMeasurement(dataflows.map(d => d.numberOfFunctionDefinitions)),
			numberOfCalls:               summarizeMeasurement(dataflows.map(d => d.numberOfCalls)),
			numberOfEdges:               summarizeMeasurement(dataflows.map(d => d.numberOfEdges)),
			sizeOfObject:                summarizeMeasurement(dataflows.map(d => d.sizeOfObject))
		}
	}
}

export function summarizeAllUltimateStats(stats: UltimateSlicerStats[]): UltimateSlicerStats {
	return {
		// these should be deterministic, so we don't technically need to use max, but we do just in case something unexpected happens :)
		totalRequests:             Math.max(...stats.map(s => s.totalRequests)),
		totalSlices:               Math.max(...stats.map(s => s.totalSlices)),
		failedToRepParse:          Math.max(...stats.map(s => s.failedToRepParse)),
		timesHitThreshold:         Math.max(...stats.map(s => s.timesHitThreshold)),
		// average out / summarize other measurements
		commonMeasurements:        new Map(CommonSlicerMeasurements.map(m => [m, summarizeSummarizedMeasurement(stats.map(s => s.commonMeasurements.get(m) as SummarizedMeasurement))])),
		perSliceMeasurements:      new Map(PerSliceMeasurements.map(m => [m, summarizeSummarizedMeasurement(stats.map(s => s.perSliceMeasurements.get(m) as SummarizedMeasurement))])),
		sliceTimePerToken:         summarizeSummarizedTimePerToken(stats.map(s => s.sliceTimePerToken)),
		reconstructTimePerToken:   summarizeSummarizedTimePerToken(stats.map(s => s.reconstructTimePerToken)),
		totalPerSliceTimePerToken: summarizeSummarizedTimePerToken(stats.map(s => s.totalPerSliceTimePerToken)),
		retrieveTimePerToken:      summarizeSummarizedTimePerToken(stats.map(s => s.retrieveTimePerToken)),
		normalizeTimePerToken:     summarizeSummarizedTimePerToken(stats.map(s => s.normalizeTimePerToken)),
		dataflowTimePerToken:      summarizeSummarizedTimePerToken(stats.map(s => s.dataflowTimePerToken)),
		totalCommonTimePerToken:   summarizeSummarizedTimePerToken(stats.map(s => s.totalCommonTimePerToken)),
		reduction:                 summarizeSummarizedReductions(stats.map(s => s.reduction)),
		reductionNoFluff:          summarizeSummarizedReductions(stats.map(s => s.reductionNoFluff)),
		input:                     {
			numberOfLines:                             summarizeSummarizedMeasurement(stats.map(s => s.input.numberOfLines)),
			numberOfNonEmptyLines:                     summarizeSummarizedMeasurement(stats.map(s => s.input.numberOfNonEmptyLines)),
			numberOfCharacters:                        summarizeSummarizedMeasurement(stats.map(s => s.input.numberOfCharacters)),
			numberOfCharactersNoComments:              summarizeSummarizedMeasurement(stats.map(s => s.input.numberOfCharactersNoComments)),
			numberOfNonWhitespaceCharacters:           summarizeSummarizedMeasurement(stats.map(s => s.input.numberOfNonWhitespaceCharacters)),
			numberOfNonWhitespaceCharactersNoComments: summarizeSummarizedMeasurement(stats.map(s => s.input.numberOfNonWhitespaceCharactersNoComments)),
			numberOfRTokens:                           summarizeSummarizedMeasurement(stats.map(s => s.input.numberOfRTokens)),
			numberOfRTokensNoComments:                 summarizeSummarizedMeasurement(stats.map(s => s.input.numberOfRTokensNoComments)),
			numberOfNormalizedTokens:                  summarizeSummarizedMeasurement(stats.map(s => s.input.numberOfNormalizedTokens)),
			numberOfNormalizedTokensNoComments:        summarizeSummarizedMeasurement(stats.map(s => s.input.numberOfNormalizedTokensNoComments))
		},
		dataflow: {
			numberOfNodes:               summarizeSummarizedMeasurement(stats.map(s => s.dataflow.numberOfNodes)),
			numberOfFunctionDefinitions: summarizeSummarizedMeasurement(stats.map(s => s.dataflow.numberOfFunctionDefinitions)),
			numberOfCalls:               summarizeSummarizedMeasurement(stats.map(s => s.dataflow.numberOfCalls)),
			numberOfEdges:               summarizeSummarizedMeasurement(stats.map(s => s.dataflow.numberOfEdges)),
			sizeOfObject:                summarizeSummarizedMeasurement(stats.map(s => s.dataflow.sizeOfObject))
		}
	}
}

export function processNextSummary(line: Buffer, allSummarized: SummarizedSlicerStats[]): void {
	let got = JSON.parse(line.toString()) as { summarize: SummarizedSlicerStats }
	got = {
		summarize: {
			...got.summarize,
			// restore maps
			memory: new Map(
				(got.summarize.memory as unknown as [CommonSlicerMeasurements, BenchmarkMemoryMeasurement][])
					.map(([k, v]) => [k, v])
			),
			commonMeasurements: new Map(
				(got.summarize.commonMeasurements as unknown as [CommonSlicerMeasurements, string][])
					.map(([k, v]) => {
						guard(v.endsWith('n'), 'Expected a bigint')
						return [k, BigInt(v.slice(0, -1))]
					})
			),
			perSliceMeasurements: {
				...got.summarize.perSliceMeasurements,
				// restore maps
				measurements: new Map(got.summarize.perSliceMeasurements.measurements as unknown as [PerSliceMeasurements, SummarizedMeasurement][]),
			}
		}
	}
	allSummarized.push(got.summarize)
}

export function processNextUltimateSummary(line: Buffer, allSummarized: UltimateSlicerStats[]): void {
	let got = JSON.parse(line.toString()) as UltimateSlicerStats
	got = {
		...got,
		// restore maps
		commonMeasurements:   new Map(got.commonMeasurements as unknown as [CommonSlicerMeasurements, SummarizedMeasurement][]),
		perSliceMeasurements: new Map(got.perSliceMeasurements as unknown as [PerSliceMeasurements, SummarizedMeasurement][]),
	}
	allSummarized.push(got)
}
