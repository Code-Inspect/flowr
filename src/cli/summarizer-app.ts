/**
 * The summarizer intends to post-process and summarize the results of
 * * the benchmark tool, and
 * * the statistics extraction.
 *
 * @module
 */

import { processCommandLineArgs } from './common'
import { BenchmarkSummarizer } from '../util/summarizer/benchmark/summarizer'
import { detectSummarizationType } from '../util/summarizer/auto-detect'
import { StatisticsSummarizer } from '../util/summarizer/statistics/summarizer'
import { SummarizerType } from '../util/summarizer/summarizer'
import { allFeatureNames } from '../statistics'

export interface SummarizerCliOptions {
	verbose:         boolean
	help:            boolean
	'ultimate-only': boolean
	categorize:      boolean
	input:           string
	type:            string
	output?:         string
	graph?:          boolean
}

const options = processCommandLineArgs<SummarizerCliOptions>('summarizer', ['input'],{
	subtitle: 'Summarize and explain the results of the benchmark tool. Summarizes in two stages: first per-request, and then overall',
	examples: [
		'{italic benchmark.json}',
		'{bold --help}'
	]
})

const outputBase = (options.output ?? options.input).replace(/\.json$|\/$/, '-summary')
console.log(`Writing outputs to base ${outputBase}`)

function getBenchmarkSummarizer() {
	return new BenchmarkSummarizer({
		graph:                  options.graph ? `${outputBase}-graph.json` : undefined,
		inputPath:              options.input,
		intermediateOutputPath: `${outputBase}.json`,
		outputPath:             `${outputBase}-ultimate.json`,
		outputLogPath:          `${outputBase}.log`,
		logger:                 console.log
	})
}

function getStatisticsSummarizer() {
	return new StatisticsSummarizer({
		inputPath:              options.input,
		outputPath:             `${outputBase}.json`,
		intermediateOutputPath: `${outputBase}-intermediate/`,
		// TODO: allow to configure
		featuresToUse:          allFeatureNames,
		logger:                 console.log
	})
}


async function retrieveSummarizer(): Promise<StatisticsSummarizer | BenchmarkSummarizer> {
	const type = options.type === 'auto' ? await detectSummarizationType(options.input) : options.type
	if(type === SummarizerType.Benchmark) {
		console.log('Summarizing benchmark')
		return getBenchmarkSummarizer()
	} else if(type === SummarizerType.Statistics) {
		console.log('Summarizing statistics')
		return getStatisticsSummarizer()
	} else {
		console.error('Unknown type', type, 'either give "benchmark" or "statistics"')
		process.exit(1)
	}
}

async function run() {
	const summarizer = await retrieveSummarizer()

	// TODO: filter statistics for prefix!
	if(!options['ultimate-only']) {
		await summarizer.preparationPhase(options.categorize)
	}

	await summarizer.summarizePhase()
}



void run()

