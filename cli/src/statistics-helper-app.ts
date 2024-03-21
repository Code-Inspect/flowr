import { RShell } from '@eagleoutice/flowr/r-bridge'
import type { FeatureKey } from '@eagleoutice/flowr-statistics'
import {
	extractUsageStatistics,
	staticRequests, initFileProvider, statisticsFileProvider
} from '@eagleoutice/flowr-statistics'
import { setFormatter, voidFormatter } from '@eagleoutice/flowr/util/ansi'
import { log } from '@eagleoutice/flowr/util/log'
import { processCommandLineArgs } from './common'
import { jsonReplacer } from '@eagleoutice/flowr/util/json'
import fs from 'fs'
import { guard } from '@eagleoutice/flowr/util/assert'
import { retrieveArchiveName } from './common/features'
import { printStepResult } from '@eagleoutice/flowr/core'
import { StepOutputFormat } from '@eagleoutice/flowr/core/print/print'
import { date2string } from '@eagleoutice/flowr/util/time'
import { create } from 'tar'
import { extractCFG } from '@eagleoutice/flowr/util/cfg/cfg'

// apps should never depend on other apps when forking (otherwise, they are "run" on load :/)

export interface StatsHelperCliOptions {
	readonly verbose:      boolean
	readonly help:         boolean
	readonly input:        string
	readonly compress:     boolean
	readonly 'dump-json':  boolean
	readonly 'output-dir': string
	readonly 'root-dir':   string
	readonly 'no-ansi':    boolean
	readonly features:     string[]
}

const options = processCommandLineArgs<StatsHelperCliOptions>('stats-helper', [],{
	subtitle: 'Given a single input file, this will collect usage statistics for the given features and write them to a file',
	examples: [
		'{bold -i} {italic example.R} {bold -i} {italic example2.R} {bold --output-dir} {italic "output-folder/"}',
		'{bold --help}'
	]
})

if(options['no-ansi']) {
	log.info('disabling ansi colors')
	setFormatter(voidFormatter)
}

let target: string | undefined = undefined
if(options.compress) {
	target = retrieveArchiveName(options['output-dir'])
	if(fs.existsSync(target)) {
		console.log(`Archive ${target} exists. Skip.`)
		process.exit(0)
	}
}

// assume correct
const processedFeatures = new Set<FeatureKey>(options.features as FeatureKey[])

const shell = new RShell()

initFileProvider(options['output-dir'])

function compressFolder(folder: string, target: string) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
	create({
		gzip:          true,
		file:          target,
		portable:      true,
		preservePaths: false
	}, [folder]).then(() => {
		// now, remove the folder
		fs.rmSync(folder, { recursive: true, force: true })
	}, () => {
		console.log(`failed to compress ${folder}`)
	})
}

async function getStatsForSingleFile() {
	await shell.obtainTmpDir()
	const stats = await extractUsageStatistics(shell,
		() => { /* do nothing */ },
		processedFeatures,
		staticRequests({ request: 'file', content: options.input }),
		options['root-dir']
	)
	// console.warn(`skipped ${stats.meta.failedRequests.length} requests due to errors (run with logs to get more info)`)

	if(stats.outputs.size === 1) {
		if(options['dump-json']) {
			const [, output] = [...stats.outputs.entries()][0]
			const cfg = extractCFG(output.normalize)
			statisticsFileProvider.append('output-json', 'parse', await printStepResult('parse', output.parse, StepOutputFormat.Json))
			statisticsFileProvider.append('output-json', 'normalize', await printStepResult('normalize', output.normalize, StepOutputFormat.Json))
			statisticsFileProvider.append('output-json', 'dataflow', await printStepResult('dataflow', output.dataflow, StepOutputFormat.Json))
			statisticsFileProvider.append('output-json', 'cfg', JSON.stringify(cfg, jsonReplacer))
		}

		statisticsFileProvider.append('meta', 'stats', JSON.stringify({ ...stats.meta, file: options.input }, jsonReplacer))
		statisticsFileProvider.append('meta', 'features', JSON.stringify(stats.features, jsonReplacer))
	} else {
		log.error(`expected exactly one output vs. ${stats.outputs.size}, got: ${JSON.stringify([...stats.outputs.keys()], jsonReplacer, 2)}`)
	}
	if(options.compress) {
		guard(target !== undefined, 'target must be defined given the compress option')
		console.log(`[${date2string(new Date())}] Compressing ${options['output-dir']} to ${target}`)
		compressFolder(options['output-dir'], target)
	}

	shell.close()
}

void getStatsForSingleFile()
