import type { MergeableRecord } from '@eagleoutice/flowr/util/objects'
import type { FeatureStatisticsWithMeta } from '../../feature'
import { readLineByLineSync } from '@eagleoutice/flowr/util/files'
import path from 'path'
import type { StatisticsOutputFormat } from '../../../output'
import fs from 'fs'
import { date2string } from '@eagleoutice/flowr/util/time'
import type {
	FunctionDefinitionInfo,
	SingleFunctionDefinitionInformation
} from './defined-functions'
import {
	AllDefinitionsFileBase
} from './defined-functions'
import type { SummarizedWithProject } from '../../post-processing'
import { emptySummarizedWithProject, recordFilePath } from '../../post-processing'
import { array2bag } from '@eagleoutice/flowr/util/arrays'
import type { SummarizedMeasurement } from '@eagleoutice/flowr/util/summarizer'
import { summarizedMeasurement2CsvHeader , summarizeMeasurement, summarizedMeasurement2Csv } from '@eagleoutice/flowr/util/summarizer'

import type { StatisticsSummarizerConfiguration } from '../../../summarizer/summarizer'

interface FunctionDefinitionSummaryInformation<Measurement> {
	total:      Measurement,
	parameters: Measurement,
	length: {
		lines:              Measurement,
		chars:              Measurement,
		nonWhitespaceChars: Measurement
	},
	returns: {
		explicit:     Measurement
		implicit:     Measurement,
		onlyExplicit: Measurement,
		onlyImplicit: Measurement
	},
	exitPointsLinePercentageInDef: Measurement[],
	linePercentageInFile:          Measurement,
	callsites:                     Measurement
}
// during the collection phase this should be a map using an array to collect
interface DefinedFunctionMetaPostProcessing<Measurement=SummarizedMeasurement> extends MergeableRecord {
	total:             Measurement
	lambdasOnly:       Measurement
	assignedFunctions: Measurement
	nestedFunctions:   Measurement
	recursive:         Measurement
	deepestNesting:    Measurement
}

function getFnDefCsv(idx: number | string, info: FunctionDefinitionSummaryInformation<number[]>) {
	return `${JSON.stringify(idx)},${summarizedMeasurement2Csv(summarizeMeasurement(info.total.flat()))}`
		+ `,${summarizedMeasurement2Csv(summarizeMeasurement(info.parameters.flat()))}`
		+ `,${summarizedMeasurement2Csv(summarizeMeasurement(info.length.lines.flat()))}`
		+ `,${summarizedMeasurement2Csv(summarizeMeasurement(info.length.chars.flat()))}`
		+ `,${summarizedMeasurement2Csv(summarizeMeasurement(info.length.nonWhitespaceChars.flat()))}`
		+ `,${summarizedMeasurement2Csv(summarizeMeasurement(info.returns.explicit.flat()))}`
		+ `,${summarizedMeasurement2Csv(summarizeMeasurement(info.returns.implicit.flat()))}`
		+ `,${summarizedMeasurement2Csv(summarizeMeasurement(info.returns.onlyExplicit.flat()))}`
		+ `,${summarizedMeasurement2Csv(summarizeMeasurement(info.returns.onlyImplicit.flat()))}`
		+ `,${summarizedMeasurement2Csv(summarizeMeasurement(info.exitPointsLinePercentageInDef.flat(2)))}`
		+ `,${summarizedMeasurement2Csv(summarizeMeasurement(info.linePercentageInFile.flat()))}\n`
}

function addToList(data: SummarizedWithProject, count: number, filepath: string, config: StatisticsSummarizerConfiguration) {
	data.count.push(count)
	if(count > 0) {
		recordFilePath(data, filepath, config)
	}
}

function retrievePerFileDefinitionInformation(featureRoot: string, info: Map<string, FeatureStatisticsWithMeta>, config: StatisticsSummarizerConfiguration, outputPath: string) {
	/**
	 * maps fn-name (including namespace) to several definition information
	 * we use tuples to reduce the memory!
	 */
	const definitionsPerFile: FunctionDefinitionSummaryInformation<number[]>[] = []
	const mergedSuperDefinitions: FunctionDefinitionSummaryInformation<number[]> = emptyFunctionDefinitionSummary()

	// we collect only `all-calls`
	readLineByLineSync(path.join(featureRoot, `${AllDefinitionsFileBase}.txt`), (line, lineNumber) => processNextLine(definitionsPerFile, lineNumber, info, JSON.parse(String(line)) as StatisticsOutputFormat<SingleFunctionDefinitionInformation[]>))

	console.log(`    [${date2string(new Date())}] Defined functions process completed, start to write out function info`)

	const fnOutStream = fs.createWriteStream(path.join(outputPath, 'function-definitions.csv'))

	const prefixes = ['total', 'params', 'length-lines', 'length-chars', 'length-non-ws-chars', 'return-explicit', 'return-implicit', 'return-only-explicit', 'return-only-implicit', 'exit-points-line-crac', 'def-line-frac']
	const others = prefixes.flatMap(summarizedMeasurement2CsvHeader).join(',')
	fnOutStream.write(`counter,${others}\n`)
	for(const [idx, info] of definitionsPerFile.entries()) {
		fnOutStream.write(getFnDefCsv(idx, info))
		mergedSuperDefinitions.total.push(...info.total)
		mergedSuperDefinitions.parameters.push(...info.parameters)
		mergedSuperDefinitions.length.lines.push(...info.length.lines)
		mergedSuperDefinitions.length.chars.push(...info.length.chars)
		mergedSuperDefinitions.length.nonWhitespaceChars.push(...info.length.nonWhitespaceChars)
		mergedSuperDefinitions.returns.explicit.push(...info.returns.explicit)
		mergedSuperDefinitions.returns.implicit.push(...info.returns.implicit)
		mergedSuperDefinitions.returns.onlyExplicit.push(...info.returns.onlyExplicit)
		mergedSuperDefinitions.returns.onlyImplicit.push(...info.returns.onlyImplicit)
		mergedSuperDefinitions.exitPointsLinePercentageInDef.push(...info.exitPointsLinePercentageInDef)
		mergedSuperDefinitions.linePercentageInFile.push(...info.linePercentageInFile)
		mergedSuperDefinitions.callsites.push(...info.callsites)
	}
	// now, write the ultimate summary at the end of the file
	fnOutStream.write(getFnDefCsv('all', mergedSuperDefinitions))
	fnOutStream.close()
}

function retrieveMetaInformation(info: Map<string, FeatureStatisticsWithMeta>, config: StatisticsSummarizerConfiguration, outputPath: string) {
	const data: DefinedFunctionMetaPostProcessing<SummarizedWithProject> = {
		total:             emptySummarizedWithProject(),
		lambdasOnly:       emptySummarizedWithProject(),
		assignedFunctions: emptySummarizedWithProject(),
		nestedFunctions:   emptySummarizedWithProject(),
		recursive:         emptySummarizedWithProject(),
		deepestNesting:    emptySummarizedWithProject()
	}
	for(const [filepath, meta] of info.entries()) {
		const us = meta.definedFunctions as FunctionDefinitionInfo
		addToList(data.total, us.total, filepath, config)
		addToList(data.lambdasOnly, us.lambdasOnly, filepath, config)
		addToList(data.assignedFunctions, us.assignedFunctions, filepath, config)
		addToList(data.nestedFunctions, us.nestedFunctions, filepath, config)
		addToList(data.recursive, us.recursive, filepath, config)
		addToList(data.deepestNesting, us.deepestNesting, filepath, config)
	}
	console.log(`    [${date2string(new Date())}] Defined functions metadata reading completed, summarizing and writing to file`)

	const out = fs.createWriteStream(path.join(outputPath, 'function-definitions-meta.csv'))
	out.write(`kind,unique-projects,unique-files,${summarizedMeasurement2CsvHeader()}\n`)
	for(const [key, val] of Object.entries(data)) {
		const data = val as SummarizedWithProject
		out.write(`${JSON.stringify(key)},${data.uniqueProjects.size},${data.uniqueFiles.size},${summarizedMeasurement2Csv(summarizeMeasurement(data.count))}\n`)
	}
	out.close()
}

function retrieveAssignedFunctionNames(featureRoot: string, config: StatisticsSummarizerConfiguration, outputPath: string) {
	const varNames = new Map<string, SummarizedWithProject>()
	readLineByLineSync(path.join(featureRoot, 'assignedFunctions.txt'), line => {
		const parsed = JSON.parse(String(line)) as StatisticsOutputFormat<string[]>
		const [hits, context] = parsed
		const countsForFile = array2bag(hits)
		for(const [name, count] of countsForFile.entries()) {
			let get = varNames.get(name)
			if(!get) {
				get = emptySummarizedWithProject()
				varNames.set(name, get)
			}
			addToList(get, count, context ?? '', config)
		}
	})
	const varNamesOut = fs.createWriteStream(path.join(outputPath, 'function-definitions-var-names.csv'))
	varNamesOut.write(`name,unique-projects,unique-files,${summarizedMeasurement2CsvHeader()}\n`)
	for(const [key, val] of varNames.entries()) {
		varNamesOut.write(`${JSON.stringify(key)},${val.uniqueProjects.size},${val.uniqueFiles.size},${summarizedMeasurement2Csv(summarizeMeasurement(val.count))}\n`)
	}
	varNamesOut.close()
}

/**
 * Note: the summary does not contain a 0 for each function that is _not_ called by a file. Hence, the minimum can not be 0 (division for mean etc. will still be performed on total file count)
 */
export function postProcess(featureRoot: string, info: Map<string, FeatureStatisticsWithMeta>, outputPath: string, config: StatisticsSummarizerConfiguration): void {
	// each number[][] contains a 'number[]' per file
	retrievePerFileDefinitionInformation(featureRoot, info, config, outputPath)

	console.log(`    [${date2string(new Date())}] Defined functions reading completed, summarizing info...`)
	retrieveMetaInformation(info, config, outputPath)
	retrieveAssignedFunctionNames(featureRoot, config, outputPath)
}

function emptyFunctionDefinitionSummary() {
	return {
		total:      [],
		parameters: [],
		length:     {
			lines:              [],
			chars:              [],
			nonWhitespaceChars: []
		},
		returns: {
			explicit:     [],
			implicit:     [],
			onlyExplicit: [],
			onlyImplicit: []
		},
		exitPointsLinePercentageInDef: [],
		linePercentageInFile:          [],
		callsites:                     []
	}
}

function processNextLine(data: FunctionDefinitionSummaryInformation<number[]>[], lineNumber: number, info: Map<string, FeatureStatisticsWithMeta>, line: StatisticsOutputFormat<SingleFunctionDefinitionInformation[]>): void {
	if(lineNumber % 2_500 === 0) {
		console.log(`    [${date2string(new Date())}] Defined functions processed ${lineNumber} lines`)
	}
	const [hits, context] = line

	const forFile: FunctionDefinitionSummaryInformation<number[]> = emptyFunctionDefinitionSummary()

	for(const { location, length, returns, numberOfParameters, callsites } of hits) {
		const stats = info.get(context ?? '')?.stats.lines[0].length

		// we retrieve the first component fo the path
		forFile.total.push(1)
		forFile.parameters.push(numberOfParameters)
		forFile.length.lines.push(length.lines)
		forFile.length.chars.push(length.characters)
		forFile.length.nonWhitespaceChars.push(length.nonWhitespaceCharacters)
		const explicits = returns.filter(r => r.explicit)
		forFile.returns.explicit.push(explicits.length)
		forFile.returns.implicit.push(returns.length - explicits.length)
		forFile.returns.onlyExplicit.push(explicits.length === returns.length ? 1 : 0)
		forFile.returns.onlyImplicit.push(explicits.length === 0 ? 1 : 0)
		forFile.exitPointsLinePercentageInDef.push(returns.map(r => r.location.line).map(l => l/length.lines))

		forFile.callsites.push(callsites.length)

		if(stats) {
			forFile.linePercentageInFile.push(location.line / stats)
		}
	}

	// push all of that to main :D
	forFile.total = [forFile.total.length]
	data.push(forFile)
}
