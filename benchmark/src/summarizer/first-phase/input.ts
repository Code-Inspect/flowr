import type {
	PerSliceMeasurements,
	PerSliceStats,
	SlicerStats ,
	CommonSlicerMeasurements } from '../../../src/stats/stats'
import type { SummarizedSlicerStats } from '../data'
import { stats2string } from '../../stats/print'
import { guard } from '@eagleoutice/flowr/util/assert'
import type { SlicingCriteria } from '@eagleoutice/flowr'
import { escape } from '@eagleoutice/flowr/util/ansi'
import fs from 'fs'
import { jsonReplacer } from '@eagleoutice/flowr/util/json'
import { readLineByLineSync } from '@eagleoutice/flowr/util/files'
import { processNextSummary, summarizeAllSummarizedStats } from '../second-phase/process'
import { summarizeSlicerStats } from './process'

interface BenchmarkData {
	filename:  string,
	'file-id': number,
	'run-num': number,
	stats:     SlicerStats
}


export async function processRunMeasurement(line: Buffer, fileNum: number, lineNum: number, summarizedText: string, outputPath: string) {
	let got = JSON.parse(line.toString()) as BenchmarkData
	console.log(`[file ${fileNum}, line ${lineNum}] Summarize for ${got.filename}`)
	// now we have to recover the maps and bigints :C
	got = {
		filename:  got.filename,
		'file-id': got['file-id'],
		'run-num': got['run-num'],
		stats:     {
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
	const summarized  = await summarizeSlicerStats(got.stats, (criterion, stats) => {
		console.log(`${escape}1F${escape}1G${escape}2K    [${++atSliceNumber}/${totalSlices}] Summarizing ${JSON.stringify(criterion)} (reconstructed has ${stats.reconstructedCode.code.length} characters)`)
	})

	console.log(`    - Append raw summary to ${outputPath}`)
	fs.appendFileSync(outputPath, `${JSON.stringify({
		filename:  got.filename,
		'file-id': got['file-id'],
		'run-num': got['run-num'],
		summarize: summarized
	}, jsonReplacer)}\n`)

	console.log(`    - Append textual summary to ${summarizedText}`)
	fs.appendFileSync(summarizedText, `${stats2string(summarized)}\n`)
}

export function processSummarizedFileMeasurement(file: string, summariesFile: string, outputPath: string) {
	console.log(`Summarize all runs for ${file}`)

	const summaries: SummarizedSlicerStats[] = []
	readLineByLineSync(summariesFile, l => processNextSummary(l, summaries))

	fs.appendFileSync(outputPath, `${JSON.stringify({
		filename:  file,
		summarize: summarizeAllSummarizedStats(summaries)
	}, jsonReplacer)}\n`)
}

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
