import type { FeatureStatisticsWithMeta } from '../../feature'
import type {
	ReplaceKeysForSummary,
	SummarizedWithProject
} from '../../post-processing'
import {
	emptySummarizedWithProject,
	recordFilePath
} from '../../post-processing'
import type { UsedPackageInfo } from './used-packages'
import { initialUsedPackageInfos } from './used-packages'
import fs from 'fs'
import path from 'path'
import { readLineByLineSync } from '@eagleoutice/flowr/util/files'
import { array2bag } from '@eagleoutice/flowr/util/arrays'
import { startAndEndsWith } from '@eagleoutice/flowr/util/strings'
import type { StatisticsSummarizerConfiguration } from '../../../summarizer/summarizer'
import { summarizedMeasurement2Csv, summarizedMeasurement2CsvHeader, summarizeMeasurement } from '@eagleoutice/flowr/util/summarizer'

type UsedPackagesPostProcessing = ReplaceKeysForSummary<UsedPackageInfo, SummarizedWithProject>


export function postProcess(featureRoot: string, info: Map<string, FeatureStatisticsWithMeta>, outputPath: string, config: StatisticsSummarizerConfiguration): void {
	const collected = {} as unknown as UsedPackagesPostProcessing

	for(const [filepath, data] of info.entries()) {
		const value = data.usedPackages as UsedPackageInfo
		for(const [key, val] of Object.entries(value)) {
			let get = collected[key] as SummarizedWithProject | undefined
			if(!get) {
				get = emptySummarizedWithProject()
				collected[key] = get
			}
			get.count.push(val)
			if(val > 0) {
				recordFilePath(get, filepath, config)
			}
		}
	}

	const variablesOutStream = fs.createWriteStream(path.join(outputPath, 'loading-functions.csv'))
	variablesOutStream.write(`kind,unique-projects,unique-files,${summarizedMeasurement2CsvHeader()}\n`)

	for(const [key, val] of Object.entries(collected)) {
		const data = val as SummarizedWithProject
		const sum = summarizeMeasurement(data.count)
		variablesOutStream.write(`${JSON.stringify(key)},${data.uniqueProjects.size},${data.uniqueFiles.size},${summarizedMeasurement2Csv(sum)}\n`)
	}
	variablesOutStream.close()


	// now we want to collect the names of the loaded libraries,
	// we collect and store them separately (per kind) but also, we want store the summarized results in the end!
	const loadedLibraries = new Map<string, SummarizedWithProject>()
	for(const key of Object.keys(initialUsedPackageInfos)) {
		const data = retrieveDataForLoad(key, featureRoot, outputPath, config)
		for(const [name, val] of data.entries()) {
			let get = loadedLibraries.get(name)
			if(!get) {
				get = emptySummarizedWithProject()
				loadedLibraries.set(name, get)
			}
			get.count.push(...val.count)
			for(const uniqueFile of val.uniqueFiles) {
				get.uniqueFiles.add(uniqueFile)
			}
			for(const uniqueProject of val.uniqueProjects) {
				get.uniqueProjects.add(uniqueProject)
			}
		}
	}

	const output = path.join(outputPath, 'all-operators.csv')
	const out = fs.createWriteStream(output)
	out.write(`kind,unique-projects,unique-files,${summarizedMeasurement2CsvHeader()}\n`)
	for(const [key, val] of loadedLibraries.entries()) {
		const { count, uniqueProjects, uniqueFiles } = val
		const sum = summarizeMeasurement(count)
		out.write(`${JSON.stringify(key)},${uniqueProjects.size},${uniqueFiles.size},${summarizedMeasurement2Csv(sum)}\n`)
	}
	out.close()
}

// directly writes the results to the output path
function retrieveDataForLoad(operator: string, readFromPath: string, outputPath: string, config: StatisticsSummarizerConfiguration): Map<string, SummarizedWithProject> {
	const input = path.join(readFromPath, `${operator}.txt`)
	if(!fs.existsSync(input)){
		// if there is nothing with this, just return :)
		return new Map()
	}

	const collected = new Map<string, SummarizedWithProject>()

	readLineByLineSync(input, (line, lineNumber) => {
		if(line.length === 0) {
			return
		}
		if(lineNumber % 2_500 === 0) {
			console.log(`    Processing line ${lineNumber} from ${input}`)
		}

		const [packages, context] = JSON.parse(line.toString()) as [string[], string]

		// first we have to collect what this file gives us
		// we normalize surrounding quotation marks
		const bag = array2bag(packages.map(p => {
			if(startAndEndsWith(p, '"') || startAndEndsWith(p, "'") || startAndEndsWith(p, '`')){
				return p.slice(1, -1)
			} else {
				return p
			}
		}))

		// now we merge it into the global map (oh gosh this is so horrible
		for(const [name, count] of bag.entries()) {
			let get = collected.get(name)
			if(!get) {
				get = emptySummarizedWithProject()
				collected.set(name, get)
			}
			get.count.push(count)
			if(count > 0) {
				recordFilePath(get, context, config)
			}
		}
	})

	const output = path.join(outputPath, `${operator}.csv`)
	const out = fs.createWriteStream(output)
	out.write(`kind,unique-projects,unique-files,${summarizedMeasurement2CsvHeader()}\n`)
	for(const [key, val] of collected.entries()) {
		const { count, uniqueProjects, uniqueFiles } = val
		const sum = summarizeMeasurement(count)
		out.write(`${JSON.stringify(key)},${uniqueProjects.size},${uniqueFiles.size},${summarizedMeasurement2Csv(sum)}\n`)
	}
	out.close()

	return collected
}
