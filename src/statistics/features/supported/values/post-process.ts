import { FeatureStatisticsWithMeta } from '../../feature'
import { StatisticsSummarizerConfiguration } from '../../../../util/summarizer/statistics/summarizer'
import {
	SummarizedMeasurement,
	summarizedMeasurement2Csv,
	summarizedMeasurement2CsvHeader
} from '../../../../util/summarizer/benchmark/data'
import { MergeableRecord } from '../../../../util/objects'
import { ValueInfo } from './values'
import fs from 'node:fs'
import path from 'path'
import { summarizeMeasurement } from '../../../../util/summarizer/benchmark/first-phase/process'
import { readLineByLineSync } from '../../../../util/files'
import { date2string } from '../../../../util/time'
import { StatisticsOutputFormat } from '../../../output'
import { array2bag } from '../../../../util/arrays'

// values contains - and + values

// TODO: group this together
interface SummarizedWithProject {
	uniqueProjects: Set<string>
	uniqueFiles:    Set<string>
	count:          number[]
}

type ValuesPostProcessing = MergeableRecord & {
	[K in keyof ValueInfo]: SummarizedWithProject
}

export function postProcess(featureRoot: string, info: Map<string, FeatureStatisticsWithMeta>, outputPath: string, config: StatisticsSummarizerConfiguration): void {
	const collected = {} as unknown as ValuesPostProcessing
	for(const [filepath, data] of info.entries()) {
		const value = data.values as ValueInfo
		for(const [key, val] of Object.entries(value)) {
			let get = collected[key] as SummarizedWithProject | undefined
			if(!get) {
				get = { count: [], uniqueFiles: new Set(), uniqueProjects: new Set() }
				collected[key] = get
			}
			get.count.push(val)
			if(val > 0) {
				// TODO: can we get magic numbers from files?
				get.uniqueFiles.add(filepath)
				get.uniqueProjects.add(filepath.split(path.sep)[config.projectSkip] ?? '')
			}
		}
	}


	const valuesOutStream = fs.createWriteStream(path.join(outputPath, 'values.csv'))
	valuesOutStream.write(`kind,unique-projects,unique-files,${summarizedMeasurement2CsvHeader()}\n`)

	for(const [key, val] of Object.entries(collected)) {
		const data = val as SummarizedWithProject
		const sum = summarizeMeasurement(data.count)
		valuesOutStream.write(`${JSON.stringify(key)},${data.uniqueProjects.size},${data.uniqueFiles.size},${summarizedMeasurement2Csv(sum)}\n`)
	}
	valuesOutStream.close()

	// now we read all numeric values to get the top used magic numbers (per file)
	const valueMap = new Map<string, SummarizedWithProject>()
	readLineByLineSync(path.join(featureRoot, 'numeric.txt'), (line, lineNumber) => {
		if(line.length === 0) {
			return
		}
		if(lineNumber % 2_500 === 0) {
			console.log(`    [${date2string(new Date())}] Collecting numeric values ${lineNumber}`)
		}
		const [values, context] = JSON.parse(String(line)) as StatisticsOutputFormat<string[]>
		const bag = array2bag(values)
		for(const [key, val] of bag.entries()) {
			let get = valueMap.get(key)
			if(!get) {
				get = { count: [], uniqueFiles: new Set(), uniqueProjects: new Set() }
				valueMap.set(key, get)
			}
			get.count.push(val)
			if(val > 0) {
				get.uniqueFiles.add(context ?? '')
				get.uniqueProjects.add(context?.split(path.sep)[config.projectSkip] ?? '')
			}
		}
	})

	const magicNumbersOutStream = fs.createWriteStream(path.join(outputPath, 'magic-numbers.csv'))
	magicNumbersOutStream.write(`num,unique-projects,unique-files,${summarizedMeasurement2CsvHeader()}\n`)

	for(const [key, val] of valueMap.entries()) {
		const sum = summarizeMeasurement(val.count)
		magicNumbersOutStream.write(`${JSON.stringify(key)},${val.uniqueProjects.size},${val.uniqueFiles.size},${summarizedMeasurement2Csv(sum)}\n`)
	}
	magicNumbersOutStream.close()
}

// TODO: meta summary for file lengths etc.
