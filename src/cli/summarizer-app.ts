/**
 * The summarizer intends to post-process and summarize the results of
 * * the benchmark tool, and
 * * the statistics extraction.
 *
 * @module
 */

import { guard } from '../util/assert'
import LineByLine from 'n-readlines'
import {
	CommonSlicerMeasurements,
	PerSliceMeasurements,
	PerSliceStats, SlicerStats,
	stats2string, summarizeAllSummarizedStats, SummarizedSlicerStats,
	summarizeSlicerStats, UltimateSlicerStats, ultimateStats2String
} from '../benchmark'
import fs from 'fs'
import { SlicingCriteria } from '../slicing'
import { escape } from '../statistics'
import { jsonReplacer } from '../util/json'
import { processCommandLineArgs } from './common'
import { MergeableRecord } from '../util/objects'
import { SummarizedMeasurement } from '../util/summarizer/benchmark/data';

export interface SummarizerCliOptions {
	verbose:         boolean
	help:            boolean
	'ultimate-only': boolean
	input:           string
	type:            string
	output?:         string
	graph?:          boolean
}

interface BenchmarkData {
	filename: string,
	stats:    SlicerStats
}

const options = processCommandLineArgs<SummarizerCliOptions>('summarizer', ['input'],{
	subtitle: 'Summarize and explain the results of the benchmark tool. Summarizes in two stages: first per-request, and then overall',
	examples: [
		'{italic benchmark.json}',
		'{bold --help}'
	]
})



function mapPerSliceStats(k: SlicingCriteria, v: PerSliceStats): [SlicingCriteria, PerSliceStats] {
	return [k, {
		reconstructedCode: v.reconstructedCode,
		slicingCriteria:   v.slicingCriteria,
		timesHitThreshold: v.timesHitThreshold,
		measurements:      new Map(
			(v.measurements as unknown as [PerSliceMeasurements, string][])
				.map(([k, v]) => {
					guard(v.endsWith('n'), 'Expected a bigint')
					return [k, BigInt(v.slice(0, -1))]
				})
		),
		numberOfDataflowNodesSliced: v.numberOfDataflowNodesSliced
	}]
}

function removeIfExists(summarizedRaw: string) {
	if(fs.existsSync(summarizedRaw)) {
		console.log(`Removing existing ${summarizedRaw}`)
		fs.unlinkSync(summarizedRaw)
	}
}

const outputBase = (options.output ?? options.input).replace(/\.json$/, '-summary')
console.log(`Writing outputs to base ${outputBase}`)
const summarizedRaw = `${outputBase}.json`

async function processNestMeasurement(line: Buffer, counter: number, summarizedText: string) {
	let got = JSON.parse(line.toString()) as BenchmarkData
	console.log(`[${++counter}] Summarize for ${got.filename}`)
	// now we have to recover the maps and bigints :C
	got = {
		filename: got.filename,
		stats:    {
			input:              got.stats.input,
			request:            got.stats.request,
			dataflow:           got.stats.dataflow,
			commonMeasurements: new Map(
				(got.stats.commonMeasurements as unknown as [CommonSlicerMeasurements, string][])
					.map(([k, v]) => {
						guard(v.endsWith('n'), 'Expected a bigint')
						return [k, BigInt(v.slice(0, -1))]
					})
			),
			perSliceMeasurements: new Map(
				(got.stats.perSliceMeasurements as unknown as [SlicingCriteria, PerSliceStats][])
					.map(([k, v]) => mapPerSliceStats(k, v))
			)
		}
	}

	const totalSlices = got.stats.perSliceMeasurements.size
	console.log(`Summarizing ${totalSlices} slices...`)
	let atSliceNumber = 0
	const summarized = await summarizeSlicerStats(got.stats, (criterion, stats) => {
		console.log(`${escape}1F${escape}1G${escape}2K    [${++atSliceNumber}/${totalSlices}] Summarizing ${JSON.stringify(criterion)} (reconstructed has ${stats.reconstructedCode.code.length} characters)`)
	})

	console.log(`    - Append raw summary to ${summarizedRaw}`)
	fs.appendFileSync(summarizedRaw, `${JSON.stringify({
		filename:  got.filename,
		summarize: summarized
	}, jsonReplacer)}\n`)

	console.log(`    - Append textual summary to ${summarizedText}`)
	fs.appendFileSync(summarizedText, `${stats2string(summarized)}\n`)
}

async function summarize() {
	const reader = new LineByLine(options.input )
	removeIfExists(summarizedRaw)
	const summarizedText = `${outputBase}.log`
	removeIfExists(summarizedText)

	let line: false | Buffer

	const counter = 0
	// eslint-disable-next-line no-cond-assign
	while(line = reader.next()) {
		await processNestMeasurement(line, counter, summarizedText)
	}
	console.log('Done summarizing')
}

function processNextSummary(line: Buffer, allSummarized: SummarizedSlicerStats[]) {
	let got = JSON.parse(line.toString()) as { filename: string, summarize: SummarizedSlicerStats }
	got = {
		filename:  got.filename,
		summarize: {
			input:              got.summarize.input,
			request:            got.summarize.request,
			dataflow:           got.summarize.dataflow,
			commonMeasurements: new Map(
				(got.summarize.commonMeasurements as unknown as [CommonSlicerMeasurements, string][])
					.map(([k, v]) => {
						guard(v.endsWith('n'), 'Expected a bigint')
						return [k, BigInt(v.slice(0, -1))]
					})
			),
			perSliceMeasurements: {
				numberOfSlices:     got.summarize.perSliceMeasurements.numberOfSlices,
				sliceCriteriaSizes: got.summarize.perSliceMeasurements.sliceCriteriaSizes,
				measurements:
														new Map(got.summarize.perSliceMeasurements.measurements as unknown as [PerSliceMeasurements, SummarizedMeasurement][]),
				reduction:         got.summarize.perSliceMeasurements.reduction,
				timesHitThreshold: got.summarize.perSliceMeasurements.timesHitThreshold,
				failedToRepParse:  got.summarize.perSliceMeasurements.failedToRepParse,
				sliceSize:         got.summarize.perSliceMeasurements.sliceSize
			}
		}
	}
	allSummarized.push(got.summarize)
}

interface BenchmarkGraphEntry extends MergeableRecord {
	name:   string,
	unit:   string,
	value:  number,
	range?: number,
	extra?: string
}

function writeGraphOutput(ultimate: UltimateSlicerStats) {
	const outputGraph = `${outputBase}-graph.json`
	console.log(`Producing benchmark graph data (${outputGraph})...`)

	const data: BenchmarkGraphEntry[] = []

	for(const { name, measurements} of [{ name: 'per-file', measurements: ultimate.commonMeasurements }, { name: 'per-slice', measurements: ultimate.perSliceMeasurements }]) {
		for(const [point, measurement] of measurements) {
			if(point === 'close R session' || point === 'initialize R session' || point === 'inject home path' || point === 'ensure installation of xmlparsedata' || point === 'retrieve token map') {
				continue
			}
			const pointName = point === 'total'? `total ${name}` : point
			data.push({
				name:  pointName[0].toUpperCase() + pointName.slice(1),
				unit:  'ms',
				value: Number(measurement.mean / 1e6),
				range: Number(measurement.std / 1e6),
				extra: `median: ${(measurement.median / 1e6).toFixed(2)}ms`
			})
		}
	}
	data.push({
		name:  'failed to reconstruct/re-parse',
		unit:  '#',
		value: ultimate.failedToRepParse,
		extra: `out of ${ultimate.totalSlices} slices`
	})
	data.push({
		name:  'times hit threshold',
		unit:  '#',
		value: ultimate.timesHitThreshold
	})
	data.push({
		name:  'reduction (characters)',
		unit:  '#',
		value: ultimate.reduction.numberOfCharacters.mean,
		extra: `std: ${ultimate.reduction.numberOfCharacters.std}`
	})
	data.push({
		name:  'reduction (normalized tokens)',
		unit:  '#',
		value: ultimate.reduction.numberOfNormalizedTokens.mean,
		extra: `std: ${ultimate.reduction.numberOfNormalizedTokens.std}`
	})


	// write the output file
	fs.writeFileSync(outputGraph, JSON.stringify(data, jsonReplacer))
}

function ultimateSummarize() {
	console.log(`Summarizing all summaries from ${options.input }...`)

	const reader = new LineByLine(summarizedRaw)
	const ultimateRaw = `${outputBase}-ultimate.json`
	removeIfExists(ultimateRaw)

	let line: false | Buffer


	const allSummarized: SummarizedSlicerStats[] = []
	// eslint-disable-next-line no-cond-assign
	while(line = reader.next()) {
		processNextSummary(line, allSummarized)
	}
	// summarizedRaw
	const ultimate = summarizeAllSummarizedStats(allSummarized)
	console.log(`Writing ultimate summary to ${ultimateRaw}`)
	fs.writeFileSync(ultimateRaw, JSON.stringify(ultimate, jsonReplacer))
	console.log(ultimateStats2String(ultimate))

	if(options.graph) {
		writeGraphOutput(ultimate)
	}

}

async function run() {
	if(!options['ultimate-only']) {
		await summarize()
	}

	ultimateSummarize()
}

void run()

