import type { FeatureStatisticsWithMeta } from '../../feature'
import type {
	ReplaceKeysForSummary,
	SummarizedWithProject
} from '../../post-processing'
import {
	emptySummarizedWithProject,
	recordFilePath
} from '../../post-processing'
import type { ExpressionListInfo } from './expression-list'
import fs from 'fs'
import path from 'path'
import type { StatisticsSummarizerConfiguration } from '../../../summarizer/summarizer'
import {
	summarizedMeasurement2Csv,
	summarizedMeasurement2CsvHeader,
	summarizeMeasurement
} from '../../../../util/summarizer'

type UsedExpressionListPostProcessing = ReplaceKeysForSummary<ExpressionListInfo, SummarizedWithProject>

export function postProcess(featureRoot: string, info: Map<string, FeatureStatisticsWithMeta>, outputPath: string, config: StatisticsSummarizerConfiguration): void {
	const collected = {} as unknown as UsedExpressionListPostProcessing

	const deepestNestingOut = fs.createWriteStream(path.join(outputPath, 'deepest-nesting-per-file.csv'))
	deepestNestingOut.write('file,deepest-nesting\n')

	for(const [filepath, data] of info.entries()) {
		const value = data.expressionList as ExpressionListInfo
		for(const [key, val] of Object.entries(value)) {
			let get = collected[key] as SummarizedWithProject | undefined
			if(!get) {
				get = emptySummarizedWithProject()
				collected[key] = get
			}
			if(key === 'deepestNesting') {
				deepestNestingOut.write(`${JSON.stringify(filepath)},${val}\n`)
			}
			get.count.push(val)
			if(val > 0) {
				recordFilePath(get, filepath, config)
			}
		}
	}
	deepestNestingOut.close()

	const variablesOutStream = fs.createWriteStream(path.join(outputPath, 'used-expression-lists.csv'))
	variablesOutStream.write(`kind,unique-projects,unique-files,${summarizedMeasurement2CsvHeader()}\n`)

	for(const [key, val] of Object.entries(collected)) {
		const data = val as SummarizedWithProject
		const sum = summarizeMeasurement(data.count)
		variablesOutStream.write(`${JSON.stringify(key)},${data.uniqueProjects.size},${data.uniqueFiles.size},${summarizedMeasurement2Csv(sum)}\n`)
	}
	variablesOutStream.close()
}
