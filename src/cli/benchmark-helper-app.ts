import fs from 'fs'
import { log } from '../util/log'
import { guard } from '../util/assert'
import { jsonReplacer } from '../util/json'
import { processCommandLineArgs } from './common/script'
import type { RParseRequestFromFile } from '../r-bridge/retriever'
import { BenchmarkSlicer } from '../benchmark/slicer'
import { DefaultAllVariablesFilter } from '../slicing/criterion/filters/all-variables'
import path from 'path'


export interface SingleBenchmarkCliOptions {
	verbose:    boolean
	help:       boolean
	input?:     string
	'file-id'?: number
	'run-num'?: number
	slice:      string
	output?:    string
}

const options = processCommandLineArgs<SingleBenchmarkCliOptions>('benchmark-helper', [],{
	subtitle: 'Will slice for all possible variables, signal by exit code if slicing was successful, and can be run standalone',
	examples: [
		'{italic example-file.R} --output {italic output.json}',
		'{bold --help}'
	]
})

if(options.verbose) {
	log.error('running with *verbose* setting - do not use for final benchmark', options)
}

const numberRegex = /^\d+$/

guard(options.slice === 'all' || options.slice === 'no' || numberRegex.test(options.slice), 'slice must be either all, no, or a number')


async function benchmark() {
	// we do not use the limit argument to be able to pick the limit randomly
	guard(options.input !== undefined, 'No input file given')
	guard(options.output !== undefined, 'No output file given')
	guard((options['file-id'] === undefined) === (options['run-num'] === undefined), 'When giving a file-id or run-num, both have to be given')

	// prefix for printing to console, includes file id and run number if present
	const prefix = `[${options.input }${options['file-id'] !== undefined ? ` (file ${options['file-id']}, run ${options['run-num']})` : ''}]`
	console.log(`${prefix} Appending output to ${options.output}`)
	fs.mkdirSync(path.parse(options.output).dir, { recursive: true })

	// ensure the file exists
	const fileStat = fs.statSync(options.input)
	guard(fileStat.isFile(), `File ${options.input} does not exist or is no file`)

	const request: RParseRequestFromFile = { request: 'file', content: options.input }

	const slicer = new BenchmarkSlicer()
	try {
		await slicer.init(request)

		// ${escape}1F${escape}1G${escape}2K for line reset
		if(options.slice === 'all') {
			const count = await slicer.sliceForAll(DefaultAllVariablesFilter, (i, total, arr) => console.log(`${prefix} Slicing ${i + 1}/${total} [${JSON.stringify(arr[i])}]`))
			console.log(`${prefix} Completed Slicing`)
			guard(count > 0, `No possible slices found for ${options.input}, skipping in count`)
		} else if(options.slice === 'no') {
			console.log(`${prefix} Skipping Slicing due to --slice=${options.slice}`)
		} else {
			const limit = parseInt(options.slice)
			console.log(`${prefix} Slicing up to ${limit} possible slices`)
			const count = await slicer.sliceForAll(DefaultAllVariablesFilter, (i, total, arr) => console.log(`${prefix} Slicing ${i + 1}/${total} [${JSON.stringify(arr[i])}]`), limit)
			console.log(`${prefix} Completed Slicing`)
			guard(count > 0, `No possible slices found for ${options.input}, skipping in count`)
		}

		const { stats } = slicer.finish()
		const output = {
			filename:  options.input,
			'file-id': options['file-id'],
			'run-num': options['run-num'],
			stats
		}

		// append line by line
		console.log(`Appending benchmark of ${options.input} to ${options.output}`)
		fs.appendFileSync(options.output, `${JSON.stringify(output, jsonReplacer)}\n`)
	} catch(e: unknown) {
		if(e instanceof Error) {
			if(!e.message.includes('unable to parse R')) {
				console.log(`${prefix} Non R-Side error : ${e.message}`)
			}
		}
		slicer.ensureSessionClosed() // ensure finish
		throw e
	}
}

void benchmark()
