import type { SummarizedSlicerStats } from '../data'
import fs from 'fs'
import { processNextSummary, summarizeAllSummarizedStats } from '../second-phase/process'
import { summarizeSlicerStats } from './process'
import { guard } from '../../../util/assert'
import { escape } from '../../../util/ansi'
import { jsonReplacer } from '../../../util/json'
import type { BenchmarkMemoryMeasurement, CommonSlicerMeasurements, PerSliceMeasurements, PerSliceStats, SlicerStats } from '../../stats/stats'
import type { SlicingCriteria } from '../../../slicing/criterion/parse'
import { stats2string } from '../../stats/print'

interface BenchmarkData {
	filename:  string,
	'file-id': number,
	'run-num': number,
	stats:     SlicerStats
}

export async function processRunMeasurement(line: Buffer, fileNum: number, lineNum: number, textOutputAppendPath: string, rawOutputPath: string) {
	let got = JSON.parse(line.toString()) as BenchmarkData
	console.log(`[file ${fileNum}, line ${lineNum}] Summarize for ${got.filename}`)
	// now we have to recover the maps and bigints :C
	got = {
		...got,
		stats: {
			...got.stats,
			memory: new Map(
				(got.stats.memory as unknown as [CommonSlicerMeasurements, BenchmarkMemoryMeasurement][])
					.map(([k, v]) => [k, v])
			),
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
		if(stats.reconstructedCode.code.length < 50) {
			console.log(`Reconstructed code: ${stats.reconstructedCode.code}`)
		}
	})

	console.log(`    - Write raw summary to ${rawOutputPath}`)
	fs.writeFileSync(rawOutputPath, `${JSON.stringify({
		filename:  got.filename,
		'file-id': got['file-id'],
		'run-num': got['run-num'],
		summarize: summarized
	}, jsonReplacer)}\n`)

	console.log(`    - Append textual summary to ${textOutputAppendPath}`)
	fs.appendFileSync(textOutputAppendPath, `${stats2string(summarized)}\n`)
}

export function processSummarizedRunMeasurement(runNum: number, summarizedFiles: string[], appendPath: string) {
	console.log(`Summarizing all file statistics for run ${runNum}`)

	const summaries: SummarizedSlicerStats[] = []
	for(const file of summarizedFiles) {
		processNextSummary(fs.readFileSync(file), summaries)
	}

	fs.appendFileSync(appendPath, `${JSON.stringify(summarizeAllSummarizedStats(summaries), jsonReplacer)}\n`)
	console.log(`Appended summary of run ${runNum} to ${appendPath}`)
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
