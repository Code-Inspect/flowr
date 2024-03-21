import * as tmp from 'tmp'
import type { Reduction, SliceSizeCollection, SummarizedSlicerStats } from '../data'
import type { SummarizedMeasurement } from '@eagleoutice/flowr/util/summarizer'
import { summarizeMeasurement } from '@eagleoutice/flowr/util/summarizer'
import { isNotUndefined } from '@eagleoutice/flowr/util/assert'
import type {
	PerSliceMeasurements,
	PerSliceStats,
	SlicerStats,
	SlicerStatsDataflow,
	SlicerStatsInput
} from '../../stats/stats'
import { log } from '@eagleoutice/flowr/util/log'
import type { SlicingCriteria } from '@eagleoutice/flowr'
import { DefaultMap } from '@eagleoutice/flowr/util/defaultmap'
import { retrieveNormalizedAstFromRCode, retrieveNumberOfRTokensOfLastParse, RShell, visitAst } from '@eagleoutice/flowr/r-bridge'
import { withoutWhitespace } from '@eagleoutice/flowr/util/strings'
import fs from 'fs'

const tempfile = (() => {
	let _tempfile: tmp.FileResult | undefined = undefined

	return () => {
		if(_tempfile === undefined) {
			_tempfile = tmp.fileSync({ postfix: '.R', keep: false })
			process.on('beforeExit', () => _tempfile?.removeCallback())
		}
		return _tempfile
	}
})()


function safeDivPercentage(a: number, b: number): number | undefined {
	if(isNaN(a) || isNaN(b)) {
		return undefined
	} else if(b === 0) {
		return a === 0 ? 0 : undefined
	} else {
		const result = 1 - (a / b)
		if(isNaN(result)) {
			log.error(`NaN for ${a} and ${b}\n`)
			return undefined
		} else {
			return result
		}
	}
}

function calculateReductionForSlice(input: SlicerStatsInput, dataflow: SlicerStatsDataflow, perSlice: {
	[k in keyof SliceSizeCollection]: number
}): Reduction<number | undefined> {
	return {
		numberOfLines:                   safeDivPercentage(perSlice.lines, input.numberOfLines),
		numberOfLinesNoAutoSelection:    safeDivPercentage(perSlice.lines - perSlice.autoSelected, input.numberOfLines),
		numberOfCharacters:              safeDivPercentage(perSlice.characters, input.numberOfCharacters),
		numberOfNonWhitespaceCharacters: safeDivPercentage(perSlice.nonWhitespaceCharacters, input.numberOfNonWhitespaceCharacters),
		numberOfRTokens:                 safeDivPercentage(perSlice.tokens, input.numberOfRTokens),
		numberOfNormalizedTokens:        safeDivPercentage(perSlice.normalizedTokens, input.numberOfNormalizedTokens),
		numberOfDataflowNodes:           safeDivPercentage(perSlice.dataflowNodes, dataflow.numberOfNodes)
	}
}

/**
 * Summarizes the given stats by calculating the min, max, median, mean, and the standard deviation for each measurement.
 * @see Slicer
 */
export async function summarizeSlicerStats(stats: SlicerStats, report: (criteria: SlicingCriteria, stats: PerSliceStats) => void = () => { /* do nothing */
}): Promise<Readonly<SummarizedSlicerStats>> {
	const perSliceStats = stats.perSliceMeasurements

	const collect = new DefaultMap<PerSliceMeasurements, number[]>(() => [])
	const sizeOfSliceCriteria: number[] = []
	const reParseShellSession = new RShell()

	const reductions: Reduction<number | undefined>[] = []

	let failedOutputs = 0

	const sliceSize: SliceSizeCollection = {
		lines:                   [],
		autoSelected:            [],
		characters:              [],
		nonWhitespaceCharacters: [],
		tokens:                  [],
		normalizedTokens:        [],
		dataflowNodes:           []
	}

	let timesHitThreshold = 0
	for(const [criteria, perSliceStat] of perSliceStats) {
		report(criteria, perSliceStat)
		for(const measure of perSliceStat.measurements) {
			collect.get(measure[0]).push(Number(measure[1]))
		}
		sizeOfSliceCriteria.push(perSliceStat.slicingCriteria.length)
		timesHitThreshold += perSliceStat.timesHitThreshold > 0 ? 1 : 0
		const { code: output, autoSelected } = perSliceStat.reconstructedCode
		sliceSize.autoSelected.push(autoSelected)
		const lines = output.split('\n').length
		sliceSize.lines.push(lines)
		sliceSize.characters.push(output.length)
		const nonWhitespace = withoutWhitespace(output).length
		sliceSize.nonWhitespaceCharacters.push(nonWhitespace)
		// reparse the output to get the number of tokens
		try {
			// there seem to be encoding issues, therefore, we dump to a temp file
			fs.writeFileSync(tempfile().name, output)
			const reParsed = await retrieveNormalizedAstFromRCode(
				{ request: 'file', content: tempfile().name },
				reParseShellSession
			)
			let numberOfNormalizedTokens = 0
			visitAst(reParsed.ast, _ => {
				numberOfNormalizedTokens++
				return false
			})
			sliceSize.normalizedTokens.push(numberOfNormalizedTokens)

			const numberOfRTokens = await retrieveNumberOfRTokensOfLastParse(reParseShellSession)
			sliceSize.tokens.push(numberOfRTokens)

			reductions.push(calculateReductionForSlice(stats.input, stats.dataflow, {
				lines:                   lines,
				characters:              output.length,
				nonWhitespaceCharacters: nonWhitespace,
				autoSelected:            autoSelected,
				tokens:                  numberOfRTokens,
				normalizedTokens:        numberOfNormalizedTokens,
				dataflowNodes:           perSliceStat.numberOfDataflowNodesSliced
			}))
		} catch(e: unknown) {
			console.error(`    ! Failed to re-parse the output of the slicer for ${JSON.stringify(criteria)}`) //, e
			console.error(`      Code: ${output}\n`)
			failedOutputs++
		}

		sliceSize.dataflowNodes.push(perSliceStat.numberOfDataflowNodesSliced)
	}

	// summarize all measurements:
	const summarized = new Map<PerSliceMeasurements, SummarizedMeasurement>()
	for(const [criterion, measurements] of collect.entries()) {
		summarized.set(criterion, summarizeMeasurement(measurements))
	}

	reParseShellSession.close()

	return {
		...stats,
		perSliceMeasurements: {
			numberOfSlices:     perSliceStats.size,
			sliceCriteriaSizes: summarizeMeasurement(sizeOfSliceCriteria),
			measurements:       summarized,
			failedToRepParse:   failedOutputs,
			timesHitThreshold,
			reduction:          {
				numberOfLines:                   summarizeMeasurement(reductions.map(r => r.numberOfLines).filter(isNotUndefined)),
				numberOfLinesNoAutoSelection:    summarizeMeasurement(reductions.map(r => r.numberOfLinesNoAutoSelection).filter(isNotUndefined)),
				numberOfCharacters:              summarizeMeasurement(reductions.map(r => r.numberOfCharacters).filter(isNotUndefined)),
				numberOfNonWhitespaceCharacters: summarizeMeasurement(reductions.map(r => r.numberOfNonWhitespaceCharacters).filter(isNotUndefined)),
				numberOfRTokens:                 summarizeMeasurement(reductions.map(r => r.numberOfRTokens).filter(isNotUndefined)),
				numberOfNormalizedTokens:        summarizeMeasurement(reductions.map(r => r.numberOfNormalizedTokens).filter(isNotUndefined)),
				numberOfDataflowNodes:           summarizeMeasurement(reductions.map(r => r.numberOfDataflowNodes).filter(isNotUndefined))
			},
			sliceSize: {
				lines:                   summarizeMeasurement(sliceSize.lines),
				characters:              summarizeMeasurement(sliceSize.characters),
				nonWhitespaceCharacters: summarizeMeasurement(sliceSize.nonWhitespaceCharacters),
				autoSelected:            summarizeMeasurement(sliceSize.autoSelected),
				tokens:                  summarizeMeasurement(sliceSize.tokens),
				normalizedTokens:        summarizeMeasurement(sliceSize.normalizedTokens),
				dataflowNodes:           summarizeMeasurement(sliceSize.dataflowNodes)
			}
		}
	}
}

export function summarizeSummarizedMeasurement(data: SummarizedMeasurement[]): SummarizedMeasurement {
	const min = data.map(d => d.min).filter(isNotUndefined).reduce((a, b) => Math.min(a, b), Infinity)
	const max = data.map(d => d.max).filter(isNotUndefined).reduce((a, b) => Math.max(a, b), -Infinity)
	// get most average
	const median = data.map(d => d.median).filter(isNotUndefined).reduce((a, b) => a + b, 0) / data.length
	const mean = data.map(d => d.mean).filter(isNotUndefined).reduce((a, b) => a + b, 0) / data.length
	// Method 1 of https://www.statology.org/averaging-standard-deviations/
	const std = Math.sqrt(data.map(d => d.std ** 2).filter(isNotUndefined).reduce((a, b) => a + b, 0) / data.length)
	const total = data.map(d => d.total).filter(isNotUndefined).reduce((a, b) => a + b, 0)
	return { min, max, median, mean, std, total }
}

export function summarizeReductions(reductions: Reduction<SummarizedMeasurement>[]): Reduction<SummarizedMeasurement> {
	return {
		numberOfDataflowNodes:           summarizeSummarizedMeasurement(reductions.map(r => r.numberOfDataflowNodes)),
		numberOfLines:                   summarizeSummarizedMeasurement(reductions.map(r => r.numberOfLines)),
		numberOfCharacters:              summarizeSummarizedMeasurement(reductions.map(r => r.numberOfCharacters)),
		numberOfNonWhitespaceCharacters: summarizeSummarizedMeasurement(reductions.map(r => r.numberOfNonWhitespaceCharacters)),
		numberOfLinesNoAutoSelection:    summarizeSummarizedMeasurement(reductions.map(r => r.numberOfLinesNoAutoSelection)),
		numberOfNormalizedTokens:        summarizeSummarizedMeasurement(reductions.map(r => r.numberOfNormalizedTokens)),
		numberOfRTokens:                 summarizeSummarizedMeasurement(reductions.map(r => r.numberOfRTokens))
	}
}
