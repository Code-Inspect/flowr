import { RParseRequestFromFile } from '../r-bridge'
import {
	postProcessFolder,
	printClusterReport,
	histogramsFromClusters,
	histograms2table,
	initFileProvider,
	setFormatter,
	voidFormatter,
	ContextsWithCount
} from '../statistics'
import { log } from '../util/log'
import { guard } from '../util/assert'
import { allRFilesFrom, writeTableAsCsv } from '../util/files'
import { DefaultMap } from '../util/defaultmap'
import { processCommandLineArgs } from './common'
import { LimitBenchmarkPool } from '../benchmark/parallel-helper'
import { validateFeatures } from './common/features'
import path from 'path'
import { jsonReplacer } from '../util/json'

export interface StatsCliOptions {
	verbose:        boolean
	help:           boolean
	'post-process': boolean
	limit:          number | undefined
	compress:       boolean
	'hist-step':    number
	input:          string[]
	'output-dir':   string
	'no-ansi':      boolean
	parallel:       number
	features:       string[]
}


const options = processCommandLineArgs<StatsCliOptions>('stats', [],{
	subtitle: 'Given input files or folders, this will collect usage statistics for the given features and write them to a file',
	examples: [
		'{bold -i} {italic example.R} {bold -i} {italic example2.R} {bold --output-dir} {italic "output-folder/"}',
		'{italic "folder1/"} {bold --features} {italic all} {bold --output-dir} {italic "output-folder/"}',
		'{bold --post-process} {italic "output-folder"} {bold --features} {italic assignments}',
		'{bold --help}'
	]
})

if(options.input.length === 0) {
	console.error('No input files given. Nothing to do. See \'--help\' if this is an error.')
	process.exit(0)
}

if(options['no-ansi']) {
	log.info('disabling ansi colors')
	setFormatter(voidFormatter)
}


const processedFeatures = validateFeatures(options.features)

if(options['post-process']) {
	console.log('-----post processing')
	guard(options.input.length === 1, 'post processing only works with a single input file')
	const reports = postProcessFolder(options.input[0], processedFeatures)
	console.log(`found ${reports.length} reports`)
	for(const report of reports) {
		const topNames = new Set(printClusterReport(report, 50))

		report.valueInfoMap = new DefaultMap<string, ContextsWithCount>(
			() => new DefaultMap(() => 0),
			new Map([...report.valueInfoMap.entries()].filter(([name]) => topNames.has(name)))
		)

		const receivedHistograms = histogramsFromClusters(report, options['hist-step'], true)

		for(const hist of receivedHistograms) {
			console.log(`${hist.name}: --- min: ${hist.min}, max: ${hist.max}, mean: ${hist.mean}, median: ${hist.median}, std: ${hist.std}`)
		}

		const outputPath = `${report.filepath}-${options['hist-step']}.dat`
		console.log(`writing histogram data to ${outputPath}`)
		writeTableAsCsv(histograms2table(receivedHistograms, true), outputPath)
		/* writeFileBasedCountToFile(fileBasedCount(report), outputPath) */
	}
	process.exit(0)
}

initFileProvider(options['output-dir'])

const testRegex = /test/i
const exampleRegex = /example/i

function getPrefixForFile(file: string) {
	if(testRegex.test(file)) {
		return 'test-'
	}	else if(exampleRegex.test(file)) {
		return 'example-'
	} else {
		return ''
	}
}

async function getStats() {
	console.log(`Processing features: ${JSON.stringify(processedFeatures, jsonReplacer)}`)
	console.log(`Using ${options.parallel} parallel executors`)

	// we do not use the limit argument to be able to pick the limit randomly
	const files: RParseRequestFromFile[] = []
	for await (const file of allRFilesFrom(options.input)) {
		files.push(file)
	}

	if(options.limit) {
		log.info(`limiting to ${options.limit} files`)
		// shuffle and limit
		files.sort(() => Math.random() - 0.5)
	}
	const limit = options.limit ?? files.length

	const verboseAdd = options.verbose ? ['--verbose'] : []
	const compress = options.compress ? ['--compress'] : []
	const features = [...processedFeatures].flatMap(s => ['--features', s])
	const pool = new LimitBenchmarkPool(
		`${__dirname}/statistics-helper-app`,
		files.map((f, idx) => ['--input', f.content, '--output-dir', path.join(options['output-dir'], `${getPrefixForFile(f.content)}${String(idx)}`), ...verboseAdd, ...features, ...compress]),
		limit,
		options.parallel
	)
	await pool.run()
	const stats = pool.getStats()
	console.log(`Processed ${stats.counter} files, skipped ${stats.skipped.length} files due to errors`)
}

void getStats()

