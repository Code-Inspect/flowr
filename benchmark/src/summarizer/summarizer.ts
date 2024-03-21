/**
 * This module is tasked with processing the results of the benchmarking (see {@link SlicerStats}).
 * @module
 */
import type { CommonSummarizerConfiguration } from '@eagleoutice/flowr/util/summarizer'
import { Summarizer } from '@eagleoutice/flowr/util/summarizer'
import type { UltimateSlicerStats } from './data'
import fs from 'fs'
import { processRunMeasurement, processSummarizedFileMeasurement } from './first-phase/input'
import { jsonReplacer } from '@eagleoutice/flowr/util/json'
import { ultimateStats2String } from '../stats'
import { processNextUltimateSummary, summarizeAllUltimateStats } from './second-phase/process'
import { writeGraphOutput } from './second-phase/graph'
import { readLineByLine, readLineByLineSync } from '@eagleoutice/flowr/util/files'
import path from 'path'

export interface BenchmarkSummarizerConfiguration extends CommonSummarizerConfiguration {
	/**
	 * If given, produce graph data output (e.g. for the benchmark visualization) to the given path
	 */
	graphOutputPath?:       string
	/**
	 * The input path to read from
	 */
	inputPath:              string
	/**
	 * Path for the intermediate results of the preparation phase
	 */
	intermediateOutputPath: string
	/**
	 * Path for the final results of the summarization phase
	 */
	outputPath:             string
}

export class BenchmarkSummarizer extends Summarizer<UltimateSlicerStats, BenchmarkSummarizerConfiguration> {
	public constructor(config: BenchmarkSummarizerConfiguration) {
		super(config)
	}

	public async preparationPhase(): Promise<void> {
		this.removeIfExists(`${this.config.intermediateOutputPath}.json`)
		this.removeIfExists(this.config.intermediateOutputPath)
		fs.mkdirSync(this.config.intermediateOutputPath)

		const dirContent = fs.readdirSync(this.config.inputPath)
		for(let i = 0; i < dirContent.length; i++) {
			const filePath   = path.join(this.config.inputPath, dirContent[i])
			const outputPath = path.join(this.config.intermediateOutputPath, dirContent[i])

			// generate measurements for each run
			await readLineByLine(filePath, (line, lineNumber) => processRunMeasurement(line, i, lineNumber, `${outputPath}.log`, outputPath))

			// generate combined measurements for the file
			processSummarizedFileMeasurement(filePath, outputPath, `${this.config.intermediateOutputPath}.json`)
		}

		this.log('Done summarizing')
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- just to obey the structure
	public async summarizePhase(): Promise<UltimateSlicerStats> {
		this.log(`Summarizing all summaries from ${this.config.inputPath}...`)

		this.removeIfExists(this.config.outputPath)

		const summaries: UltimateSlicerStats[] = []
		readLineByLineSync(`${this.config.intermediateOutputPath}.json`, (l) => processNextUltimateSummary(l, summaries))

		const ultimate = summarizeAllUltimateStats(summaries)
		this.log(`Writing ultimate summary to ${this.config.outputPath}`)
		fs.writeFileSync(this.config.outputPath, JSON.stringify(ultimate, jsonReplacer))
		console.log(ultimateStats2String(ultimate))

		if(this.config.graphOutputPath) {
			writeGraphOutput(ultimate, this.config.graphOutputPath)
		}
		return ultimate
	}

	private removeIfExists(path?: string) {
		if(path && fs.existsSync(path)) {
			this.log(`Removing existing ${path}`)
			fs.rmSync(path, { recursive: true })
		}
	}

}
