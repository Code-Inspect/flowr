import { log } from '@eagleoutice/flowr/util/log'
import { allRFilesFrom } from '@eagleoutice/flowr/util/files'
import type { RParseRequestFromFile } from '@eagleoutice/flowr/r-bridge'
import { LimitedThreadPool } from '@eagleoutice/flowr/util/parallel'
import { guard } from '@eagleoutice/flowr/util/assert'
import fs from 'fs'
import { processCommandLineArgs } from './common'
import path from 'path'

export interface BenchmarkCliOptions {
	verbose:  boolean
	help:     boolean
	input:    string[]
	output:   string
	slice:    string
	parallel: number
	limit?:   number
	runs?:    number
}


const options = processCommandLineArgs<BenchmarkCliOptions>('benchmark', [],{
	subtitle: 'Slice given files with additional benchmark information',
	examples: [
		'{italic example-folder/}',
		'{bold --help}'
	]
})

if(options.input.length === 0) {
	console.error('No input files given. Nothing to do. See \'--help\' if this is an error.')
	process.exit(0)
}

guard(options.slice === 'all' || options.slice === 'no', 'slice must be either all or no')
guard(options.runs === undefined || options.runs > 0, 'runs must be greater than zero')

function removeIfExists(summarizedRaw: string) {
	if(fs.existsSync(summarizedRaw)) {
		console.log(`Removing existing ${summarizedRaw}`)
		fs.rmSync(summarizedRaw, { recursive: true })
	}
}

async function benchmark() {
	removeIfExists(options.output)
	fs.mkdirSync(options.output)

	console.log(`Storing output in ${options.output}`)
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
	const args = files.map((f,i) => [
		'--input', f.content,
		'--file-id', `${i}`,
		'--output', path.join(options.output, `${path.parse(f.content).name}.json`),
		'--slice', options.slice, ...verboseAdd])

	const runs = options.runs ?? 1
	for(let i = 1; i <= runs; i++) {
		console.log(`Run ${i} of ${runs}`)
		const pool = new LimitedThreadPool(
			`${__dirname}/benchmark-helper-app`,
			// we reverse here "for looks", since the helper pops from the end, and we want file ids to be ascending :D
			args.map(a => [...a, '--run-num', `${i}`]).reverse(),
			limit,
			options.parallel
		)
		await pool.run()
		const stats = pool.getStats()
		console.log(`Run ${i} of ${runs}: Benchmarked ${stats.counter} files, skipped ${stats.skipped.length} files due to errors`)
	}
}

void benchmark()
