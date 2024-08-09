import fs from 'fs'
import path from 'path'
import type { StatisticsSummarizerConfiguration } from '../summarizer'
import { date2string } from '../../../util/time'
import type {
	CommonSummarizerConfiguration } from '../../../util/summarizer'
import {
	summarizedMeasurement2Csv,
	summarizedMeasurement2CsvHeader,
	summarizeMeasurement
} from '../../../util/summarizer'
import { sum } from '../../../util/arrays'
import { readLineByLineSync } from '../../../util/files'
import { guard } from '../../../util/assert'
import type { FeatureStatistics, FeatureStatisticsWithMeta } from '../../features/feature'
import { ALL_FEATURES } from '../../features/feature'
import type { MetaStatistics } from '../../meta-statistics'

function postProcessFeatures(config: StatisticsSummarizerConfiguration, filepath: string, outputPath: string, logger: (message: string) => void, metaFeatureInformation: Map<string, FeatureStatisticsWithMeta>) {
	for(const featureName of config.featuresToUse) {
		const featureInfo = ALL_FEATURES[featureName]
		const targetPath = path.join(filepath, featureInfo.name)
		const targetFeature = path.join(outputPath, featureInfo.name)

		if(!featureInfo.postProcess) {
			logger(`    Skipping post processing of ${featureName} as no post processing behavior is defined`)
			continue
		}
		logger(`    Post processing of ${featureName}...`)

		if(!fs.existsSync(targetFeature)) {
			fs.mkdirSync(targetFeature, { recursive: true })
		}

		if(global.gc) {
			logger(`    [${date2string(new Date())}] Running garbage collection (--expose-gc)`)
			global.gc()
		}
		featureInfo.postProcess(targetPath, metaFeatureInformation, targetFeature, config)
	}
}

function postProcessMeta(config: StatisticsSummarizerConfiguration, filepath: string, outputPath: string, logger: (message: string) => void, metaFeatureInformation: Map<string, FeatureStatisticsWithMeta>) {
	const fileStatisticsSummary = {
		successfulParsed:        [] as number[],
		processingTimeMs:        [] as number[],
		failedRequests:          [] as number[],
		// min lengths of 1 etc. could come from different line endings
		lines:                   [] as number[][],
		characters:              [] as number[],
		numberOfNormalizedNodes: [] as number[]
	}


	if(!fs.existsSync(path.join(outputPath, 'meta'))) {
		fs.mkdirSync(path.join(outputPath, 'meta'), { recursive: true })
	}
	const out = fs.createWriteStream(path.join(outputPath, 'meta', 'stats.csv'))
	out.write(`file,successfulParsed,${summarizedMeasurement2CsvHeader('processing')},failedRequests,${summarizedMeasurement2CsvHeader('line-length')},${summarizedMeasurement2CsvHeader('lines')},${summarizedMeasurement2CsvHeader('characters')},numberOfNormalizedNodes\n`)
	for(const [file, info] of metaFeatureInformation) {
		// we could retrieve these by summing later as well :thinking: however, this makes it more explicit
		const characters = sum(info.stats.lines[0])
		out.write(`${JSON.stringify(file)},${info.stats.successfulParsed},${summarizedMeasurement2Csv(summarizeMeasurement(info.stats.processingTimeMs))},`
				+ `${info.stats.failedRequests.length},${summarizedMeasurement2Csv(summarizeMeasurement(info.stats.lines[0]))},${summarizedMeasurement2Csv(summarizeMeasurement([info.stats.lines[0].length]))},${summarizedMeasurement2Csv(summarizeMeasurement([characters]))},${info.stats.numberOfNormalizedNodes[0]}\n`
		)
		fileStatisticsSummary.successfulParsed.push(info.stats.successfulParsed)
		fileStatisticsSummary.processingTimeMs.push(...info.stats.processingTimeMs)
		fileStatisticsSummary.failedRequests.push(info.stats.failedRequests.length)
		fileStatisticsSummary.lines.push(info.stats.lines[0])
		fileStatisticsSummary.characters.push(characters)
		fileStatisticsSummary.numberOfNormalizedNodes.push(info.stats.numberOfNormalizedNodes[0])
	}
	out.write(`all,${sum(fileStatisticsSummary.successfulParsed)},${summarizedMeasurement2Csv(summarizeMeasurement(fileStatisticsSummary.processingTimeMs))},`
		+ `${sum(fileStatisticsSummary.failedRequests)},${summarizedMeasurement2Csv(summarizeMeasurement(fileStatisticsSummary.lines.flat()))},${summarizedMeasurement2Csv(summarizeMeasurement(fileStatisticsSummary.lines.map(l => l.length)))},${summarizedMeasurement2Csv(summarizeMeasurement(fileStatisticsSummary.characters))},${sum(fileStatisticsSummary.numberOfNormalizedNodes)}\n`
	)
	out.close()
}

/**
 * Post process the collections in a given folder, retrieving the final summaries.
 *
 * @param logger       - The logger to use for outputs
 * @param filepath     - Path to the root file of the data collection (contains all the archives)
 * @param config       - Configuration of the summarizer
 * @param outputPath   - The final outputPath to write the result to (may differ from the configured root folder)
 */
export function postProcessFeatureFolder(logger: CommonSummarizerConfiguration['logger'], filepath: string, config: StatisticsSummarizerConfiguration, outputPath: string): void {
	if(!fs.existsSync(filepath)) {
		logger(`    Folder for ${filepath} does not exist, skipping post processing`)
		return
	}
	if(!fs.existsSync(outputPath)) {
		fs.mkdirSync(outputPath, { recursive: true })
	}

	const metaFeatureInformation = extractMetaInformationFrom(logger, path.join(filepath, 'meta', 'features.txt'), path.join(filepath, 'meta', 'stats.txt'))
	postProcessFeatures(config, filepath, outputPath, logger, metaFeatureInformation)
	postProcessMeta(config, filepath, outputPath, logger, metaFeatureInformation)
}


function extractMetaInformationFrom(logger: CommonSummarizerConfiguration['logger'], metaFeaturesPath: string, metaStatsPath: string): Map<string, FeatureStatisticsWithMeta> {
	const storage = new Map<string, FeatureStatisticsWithMeta>()
	logger(`    [${date2string(new Date())}] Collect feature statistics`)
	readLineByLineSync(metaFeaturesPath, (line, lineNumber) => {
		if(line.length === 0) {
			return
		}
		if(lineNumber % 2_500 === 0) {
			logger(`    [${date2string(new Date())}] ${lineNumber} meta feature lines processed`)
		}
		const meta = JSON.parse(line.toString()) as { file: string, content: FeatureStatistics }
		storage.set(meta.file, meta.content as FeatureStatisticsWithMeta)
	})
	logger(`    [${date2string(new Date())}] Collect meta statistics`)
	readLineByLineSync(metaStatsPath, (line, lineNumber) => {
		if(line.length === 0) {
			return
		}
		if(lineNumber % 2_500 === 0) {
			logger(`    [${date2string(new Date())}] ${lineNumber} meta statistics lines processed`)
		}
		const meta = JSON.parse(line.toString()) as { file: string, content: MetaStatistics }
		const existing = storage.get(meta.file)
		guard(existing !== undefined, () => `Expected to find meta information for ${meta.file} in line ${lineNumber+1} of ${metaFeaturesPath}`)
		existing.stats = meta.content
	})
	logger(`    [${date2string(new Date())}] Done collecting meta information`)
	return storage
}
