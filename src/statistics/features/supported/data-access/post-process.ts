import type { FeatureStatisticsWithMeta } from '../../feature'
import type {
	CommonSyntaxTypeCounts } from '../../common-syntax-probability'
import {
	appendCommonSyntaxTypeCounter,
	emptyCommonSyntaxTypeCounts
} from '../../common-syntax-probability'
import type { SummarizedWithProject } from '../../post-processing'
import { emptySummarizedWithProject, recordFilePath } from '../../post-processing'
import type { DataAccessInfo } from './data-access'
import fs from 'fs'
import path from 'path'
import type { StatisticsSummarizerConfiguration } from '../../../summarizer/summarizer'
import { bigint2number } from '../../../../util/numbers'
import type { MergeableRecord } from '../../../../util/objects'
import type {
	SummarizedMeasurement } from '../../../../util/summarizer'
import {
	summarizedMeasurement2Csv,
	summarizedMeasurement2CsvHeader, summarizeMeasurement
} from '../../../../util/summarizer'

interface DataAccessMetaPostProcessing<Measurement=SummarizedMeasurement> extends MergeableRecord {
	singleBracket:         Map<number, Measurement | CommonSyntaxTypeCounts<Measurement>>,
	doubleBracket:         Map<number, Measurement | CommonSyntaxTypeCounts<Measurement>>,
	chainedOrNestedAccess: Measurement,
	longestChain:          Measurement,
	deepestNesting:        Measurement,
	byName:                Measurement,
	bySlot:                Measurement,
}

function addToList(data: SummarizedWithProject, dataAccess: number, filepath: string, config: StatisticsSummarizerConfiguration) {
	data.count.push(dataAccess)
	if(dataAccess > 0) {
		recordFilePath(data, filepath, config)
	}
}

function summarizeForBracket(dataAccess: Record<number, bigint | CommonSyntaxTypeCounts>, data: DataAccessMetaPostProcessing<SummarizedWithProject>['singleBracket' | 'doubleBracket'], filepath: string, config: StatisticsSummarizerConfiguration) {
	for(const [key, val] of Object.entries(dataAccess) as [string, bigint | string | CommonSyntaxTypeCounts][]) {
		const numericKey = Number(key)
		const get = data.get(numericKey) ?? emptyCommonSyntaxTypeCounts(() => [])
		if(typeof val === 'bigint' || typeof val === 'string') {
			// it is for argument 0
			const sumGet = get as SummarizedWithProject
			const numericVal = bigint2number(val)
			sumGet.count.push(numericVal)
			if(numericVal > 0) {
				recordFilePath(sumGet, filepath, config)
			}
		} else {
			appendCommonSyntaxTypeCounter(get as CommonSyntaxTypeCounts<number[][]>, val)
		}
		data.set(numericKey, get as SummarizedWithProject)
	}
}

function writeSingleOrDoubleEmpty(outputPath: string, key: string, name: string, vals: SummarizedWithProject) {
	const out = fs.createWriteStream(path.join(outputPath, `data-access-type-${key}-${name}.csv`))
	// name is for fields like number etc. to allow to group multiple entries
	out.write(`kind,unique-projects,unique-files,${summarizedMeasurement2CsvHeader()}\n`)
	out.write(`"0",${vals.uniqueProjects.size},${vals.uniqueFiles.size},${summarizedMeasurement2Csv(summarizeMeasurement(vals.count))}\n`)
	out.close()
}

function writeSingleOrDoubleBrackets(data: Map<string, SummarizedWithProject | CommonSyntaxTypeCounts<SummarizedWithProject>>, outputPath: string, key: string) {
	for(const [name, vals] of data.entries()) {
		// the 0 column
		if('uniqueProjects' in vals) {
			writeSingleOrDoubleEmpty(outputPath, key, name, vals)
		} else {
			// non-0-column
			const out = fs.createWriteStream(path.join(outputPath, `data-access-type-${key}-${name}.csv`))
			// name is for fields like number etc. to allow to group multiple entries
			out.write(`kind,name,${summarizedMeasurement2CsvHeader()}\n`)
			for(const [entryName, values] of Object.entries(vals) as [string, number[][] | Record<string, number[][]>][]) {
				if(Array.isArray(values)) {
					out.write(`${JSON.stringify(entryName)},"",${summarizedMeasurement2Csv(summarizeMeasurement(values.flat()))}\n`)
				} else {
					for(const [keyName, keyValue] of Object.entries(values)) {
						out.write(`${JSON.stringify(entryName)},${JSON.stringify(keyName)},${summarizedMeasurement2Csv(summarizeMeasurement(keyValue.flat()))}\n`)
					}
				}
			}
			out.close()
		}
	}
}

export function postProcess(featureRoot: string, info: Map<string, FeatureStatisticsWithMeta>, outputPath: string, config: StatisticsSummarizerConfiguration): void {
	const summarize: DataAccessMetaPostProcessing<SummarizedWithProject> = {
		singleBracket:         new Map(),
		doubleBracket:         new Map(),
		chainedOrNestedAccess: emptySummarizedWithProject(),
		longestChain:          emptySummarizedWithProject(),
		deepestNesting:        emptySummarizedWithProject(),
		byName:                emptySummarizedWithProject(),
		bySlot:                emptySummarizedWithProject()
	}
	// initialize the special 0
	summarize.singleBracket.set(0, emptySummarizedWithProject())
	summarize.doubleBracket.set(0, emptySummarizedWithProject())

	for(const [filepath, value] of info.entries()) {
		const dataAccess = value.dataAccess as DataAccessInfo
		addToList(summarize.chainedOrNestedAccess, dataAccess.chainedOrNestedAccess, filepath, config)
		addToList(summarize.longestChain, dataAccess.longestChain, filepath, config)
		addToList(summarize.deepestNesting, dataAccess.deepestNesting, filepath, config)
		addToList(summarize.byName, dataAccess.byName, filepath, config)
		addToList(summarize.bySlot, dataAccess.bySlot, filepath, config)
		summarizeForBracket(dataAccess.singleBracket, summarize.singleBracket, filepath, config)
		summarizeForBracket(dataAccess.doubleBracket, summarize.doubleBracket, filepath, config)
	}

	const metaOut = fs.createWriteStream(path.join(outputPath, 'data-access-meta.csv'))
	metaOut.write(`kind,unique-projects,unique-files,${summarizedMeasurement2CsvHeader()}\n`)

	for(const [key, value] of Object.entries(summarize)) {
		const data = value as SummarizedWithProject | Map<string, SummarizedWithProject | CommonSyntaxTypeCounts<SummarizedWithProject>>
		if('uniqueProjects' in data) {
			metaOut.write(`${JSON.stringify(key)},${data.uniqueProjects.size},${data.uniqueFiles.size},${summarizedMeasurement2Csv(summarizeMeasurement(data.count))}\n`)
			continue
		}
		writeSingleOrDoubleBrackets(data, outputPath, key)
	}
	metaOut.close()
}
