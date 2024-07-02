/**
 * The summarizer intends to post-process and summarize the results of
 * * the benchmark tool, and
 * * the statistics extraction.
 *
 * @module
 */

import { BenchmarkSummarizer } from '../benchmark/summarizer/summarizer'
import { StatisticsSummarizer } from '../statistics/summarizer/summarizer'
import { detectSummarizationType } from '../statistics/summarizer/auto-detect'
import { SummarizerType } from '../util/summarizer'
import { processCommandLineArgs } from './common/script'
import { allFeatureNames } from '../statistics/features/feature'

export interface SummarizerCliOptions {
	verbose:         boolean
	help:            boolean
	'ultimate-only': boolean
	categorize:      boolean
	input:           string
	type:            string
	output?:         string
	graph?:          boolean
	'project-skip':  number
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
		graphOutputPath:        options.graph ? `${outputBase}-graph.json` : undefined,
		inputPath:              options.input,
		intermediateOutputPath: outputBase,
		outputPath:             `${outputBase}-ultimate.json`,
		logger:                 console.log
	})
}

function getStatisticsSummarizer() {
	return new StatisticsSummarizer({
		inputPath:              options.input,
		outputPath:             `${outputBase}-final`,
		intermediateOutputPath: `${outputBase}-intermediate/`,
		projectSkip:            options['project-skip'],
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

	if(!options['ultimate-only']) {
		await summarizer.preparationPhase(options.categorize)
	}

	await summarizer.summarizePhase()
}



void run()
