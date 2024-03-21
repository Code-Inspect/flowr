import type { FeatureStatisticsWithMeta } from '../../feature'
import type { SummarizedWithProject } from '../../post-processing'
import { emptySummarizedWithProject, recordFilePath } from '../../post-processing'
import type { LoopInfo } from './loops'
import type { MergeableRecord } from '@eagleoutice/flowr/util/objects'
import type {
	CommonSyntaxTypeCounts } from '../../common-syntax-probability'
import {
	appendCommonSyntaxTypeCounter,
	emptyCommonSyntaxTypeCounts
} from '../../common-syntax-probability'
import { bigint2number } from '@eagleoutice/flowr/util/numbers'
import path from 'path'
import fs from 'fs'
import { summarizedMeasurement2Csv, summarizedMeasurement2CsvHeader, summarizeMeasurement } from '@eagleoutice/flowr/util/summarizer'
import type { StatisticsSummarizerConfiguration } from '../../../summarizer/summarizer'

type LoopInfoPostProcess = MergeableRecord & {
	[k in keyof LoopInfo]: LoopInfo[k] extends number | bigint ? SummarizedWithProject : CommonSyntaxTypeCounts<number[][]>
}

export function postProcess(featureRoot: string, info: Map<string, FeatureStatisticsWithMeta>, outputPath: string, config: StatisticsSummarizerConfiguration): void {
	const collected: LoopInfoPostProcess = {
		forLoops:               emptyCommonSyntaxTypeCounts(() => []),
		forLoopVar:             emptyCommonSyntaxTypeCounts(() => []),
		forBody:                emptyCommonSyntaxTypeCounts(() => []),
		whileLoops:             emptyCommonSyntaxTypeCounts(() => []),
		whileBody:              emptyCommonSyntaxTypeCounts(() => []),
		repeatLoops:            emptySummarizedWithProject(),
		repeatBody:             emptyCommonSyntaxTypeCounts(() => []),
		breakStatements:        emptySummarizedWithProject(),
		nextStatements:         emptySummarizedWithProject(),
		implicitLoops:          emptySummarizedWithProject(),
		nestedExplicitLoops:    emptySummarizedWithProject(),
		deepestExplicitNesting: emptySummarizedWithProject()
	}

	for(const [filepath, data] of info.entries()) {
		const value = data.loops as LoopInfo
		for(const [key, val] of Object.entries(value)) {
			if(typeof val !== 'object') {
				const get = collected[key] as SummarizedWithProject
				get.count.push(typeof val === 'number' ? Number(val) : bigint2number(val))
				if(val > 0) {
					recordFilePath(get, filepath, config)
				}
			} else {
				appendCommonSyntaxTypeCounter(collected[key] as CommonSyntaxTypeCounts<number[][]>, val)
			}
		}
	}

	const metaOut = fs.createWriteStream(path.join(outputPath, 'loops-meta.csv'))
	metaOut.write(`kind,unique-projects,unique-files,${summarizedMeasurement2CsvHeader()}\n`)
	for(const [key, val] of Object.entries(collected)) {
		const data = val as SummarizedWithProject | CommonSyntaxTypeCounts<number[][]>
		if('uniqueProjects' in data) {
			metaOut.write(`${JSON.stringify(key)},${data.uniqueProjects.size},${data.uniqueFiles.size},${summarizedMeasurement2Csv(summarizeMeasurement(data.count))}\n`)
		} else {
			// new file for each :D
			const out = fs.createWriteStream(path.join(outputPath, `loops-type-${key}.csv`))
			// name is for fields like number etc to allow to group multiple entries
			out.write(`kind,name,${summarizedMeasurement2CsvHeader()}\n`)
			for(const [name, vals] of Object.entries(data) as [string, number[][] | Record<string, number[][]>][]) {
				if(Array.isArray(vals)) {
					out.write(`${JSON.stringify(name)},"",${summarizedMeasurement2Csv(summarizeMeasurement(vals.flat()))}\n`)
				} else {
					for(const [keyName, keyValue] of Object.entries(vals)) {
						out.write(`${JSON.stringify(name)},${JSON.stringify(keyName)},${summarizedMeasurement2Csv(summarizeMeasurement(keyValue.flat()))}\n`)
					}
				}
			}
			out.close()
		}
	}
	metaOut.close()
}
