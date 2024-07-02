import * as tmp from 'tmp'
import type { Reduction, SliceSizeCollection, SummarizedSlicerStats, TimePerToken } from '../data'

import fs from 'fs'
import { DefaultMap } from '../../../util/defaultmap'
import { log } from '../../../util/log'
import { withoutWhitespace } from '../../../util/strings'
import type { SummarizedMeasurement } from '../../../util/summarizer'
import { summarizeMeasurement } from '../../../util/summarizer'
import { isNotUndefined } from '../../../util/assert'
import type { PerSliceMeasurements, PerSliceStats, SlicerStats, SlicerStatsDataflow, SlicerStatsInput } from '../../stats/stats'
import type { SlicingCriteria } from '../../../slicing/criterion/parse'
import { RShell } from '../../../r-bridge/shell'
import { retrieveNormalizedAstFromRCode, retrieveNumberOfRTokensOfLastParse } from '../../../r-bridge/retriever'
import { visitAst } from '../../../r-bridge/lang-4.x/ast/model/processing/visitor'
import { RType } from '../../../r-bridge/lang-4.x/ast/model/type'

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
}, ignoreFluff: boolean): Reduction<number | undefined> {
	const perSliceLines = ignoreFluff ? perSlice.nonEmptyLines : perSlice.lines
	const inputLines = ignoreFluff ? input.numberOfNonEmptyLines : input.numberOfLines
	return {
		numberOfLines:                safeDivPercentage(perSliceLines, inputLines),
		numberOfLinesNoAutoSelection: safeDivPercentage(perSliceLines - perSlice.linesWithAutoSelected, inputLines),
		numberOfCharacters:           ignoreFluff ?
			safeDivPercentage(perSlice.charactersNoComments, input.numberOfCharactersNoComments) :
			safeDivPercentage(perSlice.characters, input.numberOfCharacters),
		numberOfNonWhitespaceCharacters: ignoreFluff ?
			safeDivPercentage(perSlice.nonWhitespaceCharactersNoComments, input.numberOfNonWhitespaceCharactersNoComments) :
			safeDivPercentage(perSlice.nonWhitespaceCharacters, input.numberOfNonWhitespaceCharacters),
		numberOfRTokens: ignoreFluff ?
			safeDivPercentage(perSlice.tokensNoComments, input.numberOfRTokensNoComments) :
			safeDivPercentage(perSlice.tokens, input.numberOfRTokens),
		numberOfNormalizedTokens: ignoreFluff ?
			safeDivPercentage(perSlice.normalizedTokensNoComments, input.numberOfNormalizedTokensNoComments) :
			safeDivPercentage(perSlice.normalizedTokens, input.numberOfNormalizedTokens),
		numberOfDataflowNodes: safeDivPercentage(perSlice.dataflowNodes, dataflow.numberOfNodes)
	}
}

/**
 * Summarizes the given stats by calculating the min, max, median, mean, and the standard deviation for each measurement.
 * @see Slicer
 */
export async function summarizeSlicerStats(
	stats: SlicerStats,
	report: (criteria: SlicingCriteria, stats: PerSliceStats) => void = () => { /* do nothing */
	}): Promise<Readonly<SummarizedSlicerStats>> {
	const collect = new DefaultMap<PerSliceMeasurements, number[]>(() => [])
	const sizeOfSliceCriteria: number[] = []
	const reParseShellSession = new RShell()

	const sliceTimes: TimePerToken<number>[] = []
	const reconstructTimes: TimePerToken<number>[] = []
	const totalTimes: TimePerToken<number>[] = []
	const reductions: Reduction<number | undefined>[] = []
	const reductionsNoFluff: Reduction<number | undefined>[] = []

	let failedOutputs = 0

	const sliceSize: SliceSizeCollection = {
		lines:                             [],
		nonEmptyLines:                     [],
		linesWithAutoSelected:             [],
		characters:                        [],
		charactersNoComments:              [],
		nonWhitespaceCharacters:           [],
		nonWhitespaceCharactersNoComments: [],
		tokens:                            [],
		tokensNoComments:                  [],
		normalizedTokens:                  [],
		normalizedTokensNoComments:        [],
		dataflowNodes:                     []
	}

	let timesHitThreshold = 0
	for(const [criteria, perSliceStat] of stats.perSliceMeasurements) {
		report(criteria, perSliceStat)
		for(const measure of perSliceStat.measurements) {
			collect.get(measure[0]).push(Number(measure[1]))
		}
		sizeOfSliceCriteria.push(perSliceStat.slicingCriteria.length)
		timesHitThreshold += perSliceStat.timesHitThreshold > 0 ? 1 : 0
		const { code: output, linesWithAutoSelected } = perSliceStat.reconstructedCode
		sliceSize.linesWithAutoSelected.push(linesWithAutoSelected)
		const split = output.split('\n')
		const lines = split.length
		const nonEmptyLines = split.filter(l => l.trim().length > 0).length
		sliceSize.lines.push(lines)
		sliceSize.nonEmptyLines.push(nonEmptyLines)
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
			let numberOfNormalizedTokensNoComments = 0
			let commentChars = 0
			let commentCharsNoWhitespace = 0
			visitAst(reParsed.ast, t => {
				numberOfNormalizedTokens++
				const comments = t.info.additionalTokens?.filter(t => t.type === RType.Comment)
				if(comments && comments.length > 0) {
					const content = comments.map(c => c.lexeme ?? '').join('')
					commentChars += content.length
					commentCharsNoWhitespace += withoutWhitespace(content).length
				} else {
					numberOfNormalizedTokensNoComments++
				}
				return false
			})
			sliceSize.normalizedTokens.push(numberOfNormalizedTokens)
			sliceSize.normalizedTokensNoComments.push(numberOfNormalizedTokensNoComments)
			sliceSize.charactersNoComments.push(output.length - commentChars)
			sliceSize.nonWhitespaceCharactersNoComments.push(nonWhitespace - commentCharsNoWhitespace)

			const numberOfRTokens = await retrieveNumberOfRTokensOfLastParse(reParseShellSession)
			sliceSize.tokens.push(numberOfRTokens)
			const numberOfRTokensNoComments = await retrieveNumberOfRTokensOfLastParse(reParseShellSession, true)
			sliceSize.tokensNoComments.push(numberOfRTokensNoComments)

			const perSlice: {[k in keyof SliceSizeCollection]: number} = {
				lines:                             lines,
				nonEmptyLines:                     nonEmptyLines,
				characters:                        output.length,
				charactersNoComments:              output.length - commentChars,
				nonWhitespaceCharacters:           nonWhitespace,
				nonWhitespaceCharactersNoComments: nonWhitespace - commentCharsNoWhitespace,
				linesWithAutoSelected:             linesWithAutoSelected,
				tokens:                            numberOfRTokens,
				tokensNoComments:                  numberOfRTokensNoComments,
				normalizedTokens:                  numberOfNormalizedTokens,
				normalizedTokensNoComments:        numberOfNormalizedTokensNoComments,
				dataflowNodes:                     perSliceStat.numberOfDataflowNodesSliced
			}
			reductions.push(calculateReductionForSlice(stats.input, stats.dataflow, perSlice, false))
			reductionsNoFluff.push(calculateReductionForSlice(stats.input, stats.dataflow, perSlice, true))

			const sliceTime = Number(perSliceStat.measurements.get('static slicing'))
			const reconstructTime = Number(perSliceStat.measurements.get('reconstruct code'))
			sliceTimes.push({
				raw:        sliceTime / numberOfRTokens,
				normalized: sliceTime / numberOfNormalizedTokens
			})
			reconstructTimes.push({
				raw:        reconstructTime / numberOfRTokens,
				normalized: reconstructTime / numberOfNormalizedTokens
			})
			totalTimes.push({
				raw:        (sliceTime + reconstructTime ) / numberOfRTokens,
				normalized: (sliceTime + reconstructTime) / numberOfNormalizedTokens
			})
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
			numberOfSlices:            stats.perSliceMeasurements.size,
			sliceCriteriaSizes:        summarizeMeasurement(sizeOfSliceCriteria),
			measurements:              summarized,
			failedToRepParse:          failedOutputs,
			timesHitThreshold,
			reduction:                 summarizeReductions(reductions),
			reductionNoFluff:          summarizeReductions(reductionsNoFluff),
			sliceTimePerToken:         summarizeTimePerToken(sliceTimes),
			reconstructTimePerToken:   summarizeTimePerToken(reconstructTimes),
			totalPerSliceTimePerToken: summarizeTimePerToken(totalTimes),
			sliceSize:                 {
				lines:                             summarizeMeasurement(sliceSize.lines),
				nonEmptyLines:                     summarizeMeasurement(sliceSize.nonEmptyLines),
				characters:                        summarizeMeasurement(sliceSize.characters),
				charactersNoComments:              summarizeMeasurement(sliceSize.charactersNoComments),
				nonWhitespaceCharacters:           summarizeMeasurement(sliceSize.nonWhitespaceCharacters),
				nonWhitespaceCharactersNoComments: summarizeMeasurement(sliceSize.nonWhitespaceCharactersNoComments),
				linesWithAutoSelected:             summarizeMeasurement(sliceSize.linesWithAutoSelected),
				tokens:                            summarizeMeasurement(sliceSize.tokens),
				tokensNoComments:                  summarizeMeasurement(sliceSize.tokensNoComments),
				normalizedTokens:                  summarizeMeasurement(sliceSize.normalizedTokens),
				normalizedTokensNoComments:        summarizeMeasurement(sliceSize.normalizedTokensNoComments),
				dataflowNodes:                     summarizeMeasurement(sliceSize.dataflowNodes)
			}
		}
	}
}

export function summarizeSummarizedMeasurement(data: SummarizedMeasurement[]): SummarizedMeasurement {
	data = data.filter(isNotUndefined)
	const min = data.map(d => d.min).filter(isNotUndefined).reduce((a, b) => Math.min(a, b), Infinity)
	const max = data.map(d => d.max).filter(isNotUndefined).reduce((a, b) => Math.max(a, b), -Infinity)
	// calculate median of medians (don't just average the median!)
	const medians = data.map(d => d.median).filter(isNotUndefined).sort((a, b) => a - b)
	const median = medians[Math.floor(medians.length / 2)]
	const mean = data.map(d => d.mean).filter(isNotUndefined).reduce((a, b) => a + b, 0) / data.length
	// Method 1 of https://www.statology.org/averaging-standard-deviations/
	const std = Math.sqrt(data.map(d => d.std ** 2).filter(isNotUndefined).reduce((a, b) => a + b, 0) / data.length)
	const total = data.map(d => d.total).filter(isNotUndefined).reduce((a, b) => a + b, 0)
	return { min, max, median, mean, std, total }
}

export function summarizeSummarizedReductions(reductions: Reduction<SummarizedMeasurement>[]): Reduction<SummarizedMeasurement> {
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

function summarizeReductions(reductions: Reduction<number | undefined>[]): Reduction<SummarizedMeasurement> {
	return {
		numberOfLines:                   summarizeMeasurement(reductions.map(r => r.numberOfLines).filter(isNotUndefined)),
		numberOfLinesNoAutoSelection:    summarizeMeasurement(reductions.map(r => r.numberOfLinesNoAutoSelection).filter(isNotUndefined)),
		numberOfCharacters:              summarizeMeasurement(reductions.map(r => r.numberOfCharacters).filter(isNotUndefined)),
		numberOfNonWhitespaceCharacters: summarizeMeasurement(reductions.map(r => r.numberOfNonWhitespaceCharacters).filter(isNotUndefined)),
		numberOfRTokens:                 summarizeMeasurement(reductions.map(r => r.numberOfRTokens).filter(isNotUndefined)),
		numberOfNormalizedTokens:        summarizeMeasurement(reductions.map(r => r.numberOfNormalizedTokens).filter(isNotUndefined)),
		numberOfDataflowNodes:           summarizeMeasurement(reductions.map(r => r.numberOfDataflowNodes).filter(isNotUndefined))
	}
}

export function summarizeSummarizedTimePerToken(times: TimePerToken[]): TimePerToken {
	return {
		raw:        summarizeSummarizedMeasurement(times.map(t => t.raw)),
		normalized: summarizeSummarizedMeasurement(times.map(t => t.normalized)),
	}
}

export function summarizeTimePerToken(times: TimePerToken<number>[]): TimePerToken {
	return {
		raw:        summarizeMeasurement(times.map(t => t.raw)),
		normalized: summarizeMeasurement(times.map(t => t.normalized)),
	}
}
