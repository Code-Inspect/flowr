import type { FeatureStatisticsWithMeta } from '../../feature'
import type {
	ReplaceKeysForSummary,
	SummarizedWithProject
} from '../../post-processing'
import {
	emptySummarizedWithProject,
	recordFilePath
} from '../../post-processing'
import type { DefinedVariableInformation, VariableInfo } from './variables'
import fs from 'fs'
import path from 'path'
import { readLineByLineSync } from '@eagleoutice/flowr/util/files'
import type { MergeableRecord } from '@eagleoutice/flowr/util/objects'
import type { StatisticsSummarizerConfiguration } from '../../../summarizer/summarizer'
import { summarizedMeasurement2Csv, summarizedMeasurement2CsvHeader, summarizeMeasurement } from '@eagleoutice/flowr/util/summarizer'

type VariablesPostProcessing = ReplaceKeysForSummary<VariableInfo, SummarizedWithProject>

function collectUsedVariables(featureRoot: string, info: Map<string, FeatureStatisticsWithMeta>, config: StatisticsSummarizerConfiguration, outputPath: string) {
	const used = collectVariableInfoFor(path.join(featureRoot, 'usedVariables.txt'), info, config)
	writeVariableInfoToCsv(outputPath, 'used-variables.csv', used)
	// we manually clear these maps to save memory
	used.clear()
}

function collectDefinedVariables(featureRoot: string, info: Map<string, FeatureStatisticsWithMeta>, config: StatisticsSummarizerConfiguration, outputPath: string) {
	const defined = collectVariableInfoFor(path.join(featureRoot, 'definedVariables.txt'), info, config)
	writeVariableInfoToCsv(outputPath, 'defined-variables.csv', defined)
	defined.clear()
}

function collectRedefinedVariables(featureRoot: string, info: Map<string, FeatureStatisticsWithMeta>, config: StatisticsSummarizerConfiguration, outputPath: string) {
	const redefined = collectVariableInfoFor(path.join(featureRoot, 'redefinedVariables.txt'), info, config)
	writeVariableInfoToCsv(outputPath, 'redefined-variables.csv', redefined)
	redefined.clear()
}

function writeVariableCountsToCsv(outputPath: string, collected: MergeableRecord & {
	numberOfRedefinitions: SummarizedWithProject;
	unknownVariables:      SummarizedWithProject;
	numberOfVariableUses:  SummarizedWithProject;
	numberOfDefinitions:   SummarizedWithProject
}) {
	const variablesOutStream = fs.createWriteStream(path.join(outputPath, 'variable-counts.csv'))
	variablesOutStream.write(`kind,unique-projects,unique-files,${summarizedMeasurement2CsvHeader()}\n`)

	for(const [key, val] of Object.entries(collected)) {
		if(key === 'unknownVariables') {
			// they are for function calls etc and in hindsight not a good idea
			continue
		}
		const data = val as SummarizedWithProject
		const sum = summarizeMeasurement(data.count)
		variablesOutStream.write(`${JSON.stringify(key)},${data.uniqueProjects.size},${data.uniqueFiles.size},${summarizedMeasurement2Csv(sum)}\n`)
	}
	variablesOutStream.close()
}

function collectInformation(info: Map<string, FeatureStatisticsWithMeta>, config: StatisticsSummarizerConfiguration) {
	const collected = {} as unknown as VariablesPostProcessing
	for(const [filepath, data] of info.entries()) {
		const value = data.variables as VariableInfo
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
	return collected
}

export function postProcess(featureRoot: string, info: Map<string, FeatureStatisticsWithMeta>, outputPath: string, config: StatisticsSummarizerConfiguration): void {
	const collected = collectInformation(info, config)

	writeVariableCountsToCsv(outputPath, collected)
	collectUsedVariables(featureRoot, info, config, outputPath)
	collectDefinedVariables(featureRoot, info, config, outputPath)
	collectRedefinedVariables(featureRoot, info, config, outputPath)
}

type VariableInfoMap = Map<string, SummarizedWithProject & { linePercentageInFile: number[][] }>

export function writeVariableInfoToCsv(outputPath: string, filename: `${string}.csv`, data: VariableInfoMap): void {
	const out = fs.createWriteStream(path.join(outputPath, filename))
	out.write(`variable,unique-projects,unique-files,${summarizedMeasurement2CsvHeader('count')},${summarizedMeasurement2CsvHeader('line-frac')}\n`)
	for(const [key, val] of data.entries()) {
		const { count, uniqueProjects, uniqueFiles, linePercentageInFile } = val
		const counts = summarizeMeasurement(count)
		const lineFrac = summarizeMeasurement(linePercentageInFile.flat())
		out.write(`${JSON.stringify(key)},${uniqueProjects.size},${uniqueFiles.size},${summarizedMeasurement2Csv(counts)},${summarizedMeasurement2Csv(lineFrac)}\n`)
	}
	out.close()
}

function collectVariableInfoFor(filepath: string, info: Map<string, FeatureStatisticsWithMeta>, config: StatisticsSummarizerConfiguration): VariableInfoMap {
	// variable name to summary
	const collected = new Map<string, SummarizedWithProject & { linePercentageInFile: number[][] }>()

	readLineByLineSync(filepath, (line, lineNumber) => {
		if(line.length === 0) {
			return
		}
		if(lineNumber % 2_500 === 0) {
			console.log(`    Processed ${lineNumber} lines of ${filepath}`)
		}
		const [vars, context] = JSON.parse(line.toString()) as [DefinedVariableInformation[], string]
		const numberOfLines = info.get(context as string | undefined ?? '')?.stats.lines[0].length

		// first we have to collect what this file gives us
		const perFile = new Map<string, SummarizedWithProject & { linePercentageInFile: number[] }>()
		for(const [name, [line]] of vars) {
			let get = perFile.get(name)
			if(!get) {
				get = { ... emptySummarizedWithProject(), linePercentageInFile: [] }
				perFile.set(name, get)
			}
			get.count.push(1)
			if(numberOfLines) {
				get.linePercentageInFile.push(line / numberOfLines)
			}
		}

		// now we merge it into the global map (oh gosh this is so horrible
		for(const [name, data] of perFile.entries()) {
			let get = collected.get(name)
			if(!get) {
				get = { ... emptySummarizedWithProject(), linePercentageInFile: [] }
				collected.set(name, get)
			}
			get.count.push(data.count.length)
			get.linePercentageInFile.push(data.linePercentageInFile)
			if(data.count.length > 0) {
				recordFilePath(get, context, config)
			}
		}
	})

	return collected
}
