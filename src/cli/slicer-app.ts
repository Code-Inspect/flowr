import fs from 'fs'
import { guard } from '../util/assert'
import type { SliceResult } from '../slicing/static/slicer-types'
import { log } from '../util/log'
import { summarizeSlicerStats } from '../benchmark/summarizer/first-phase/process'
import { sliceDiffAnsi } from '../core/print/slice-diff-ansi'
import { jsonReplacer } from '../util/json'
import { processCommandLineArgs } from './common/script'
import { BenchmarkSlicer } from '../benchmark/slicer'
import type { SingleSlicingCriterion, SlicingCriteria } from '../slicing/criterion/parse'
import type { ReconstructionResult } from '../reconstruct/reconstruct'
import type { NodeId } from '../r-bridge/lang-4.x/ast/model/processing/node-id'
import { stats2string } from '../benchmark/stats/print'

export interface SlicerCliOptions {
	verbose:         boolean
	help:            boolean
	input:           string | undefined
	criterion:       string | undefined
	output:          string | undefined
	diff:            boolean
	'input-is-text': boolean
	stats:           boolean
	api:             boolean
}


const options = processCommandLineArgs<SlicerCliOptions>('slicer', ['input', 'criterion'],{
	subtitle: 'Slice R code based on a given slicing criterion',
	examples: [
		'{bold -c} {italic "12@product"} {italic test/testfiles/example.R}',
		// why double escaped :C
		'{bold -c} {italic "3@a"} {bold -r} {italic "a <- 3\\\\nb <- 4\\\\nprint(a)"} {bold --diff}',
		'{bold -i} {italic example.R} {bold --stats} {bold --criterion} {italic "8:3;3:1;12@product"}',
		'{bold --help}'
	]
})

async function getSlice() {
	const slicer = new BenchmarkSlicer()
	guard(options.input !== undefined, 'input must be given')
	guard(options.criterion !== undefined, 'a slicing criterion must be given')

	await slicer.init(options['input-is-text'] ? { request: 'text', content: options.input } : { request: 'file', content: options.input })

	let mappedSlices: { criterion: SingleSlicingCriterion, id: NodeId }[] = []
	let reconstruct: ReconstructionResult | undefined = undefined

	const doSlicing = options.criterion.trim() !== ''
	let slice: SliceResult | undefined = undefined

	if(doSlicing) {
		const slices = options.criterion.split(';').map(c => c.trim())

		try {
			const { stats: { reconstructedCode, slicingCriteria }, slice: sliced } = await slicer.slice(...slices as SlicingCriteria)
			slice = sliced
			mappedSlices = slicingCriteria
			reconstruct = reconstructedCode
			if(options.output) {
				console.log('Written reconstructed code to', options.output)
				console.log(`Automatically selected ${reconstructedCode.linesWithAutoSelected} lines`)
				fs.writeFileSync(options.output, reconstructedCode.code)
			} else if(!options.api && !options.diff) {
				console.log(reconstructedCode.code)
			}
		} catch(e: unknown) {
			log.error(`[Skipped] Error while processing ${options.input}: ${(e as Error).message} (${(e as Error).stack ?? ''})`)
		}
	}

	const { stats, normalize, parse, tokenMap, dataflow } = slicer.finish()
	const mappedCriteria = mappedSlices.map(c => `    ${c.criterion} => ${c.id} (${JSON.stringify(normalize.idMap.get(c.id)?.location)})`).join('\n')
	log.info(`Mapped criteria:\n${mappedCriteria}`)
	const sliceStatsAsString = stats2string(await summarizeSlicerStats(stats))

	if(options.api) {
		const output = {
			tokenMap,
			parse,
			normalize,
			dataflow,
			...(options.stats ? { stats } : {}),
			...(doSlicing ? { slice: mappedSlices, reconstruct } : {})
		}

		console.log(JSON.stringify(output, jsonReplacer))
	} else {
		if(doSlicing && options.diff) {
			const originalCode = options['input-is-text'] ? options.input : fs.readFileSync(options.input).toString()
			console.log(sliceDiffAnsi((slice as SliceResult).result, normalize, new Set(mappedSlices.map(({ id }) => id)), originalCode))
		}
		if(options.stats) {
			console.log(sliceStatsAsString)
			const filename = `${options.input}.stats`
			console.log(`Writing stats for ${options.input} to "${filename}"`)
			fs.writeFileSync(filename, sliceStatsAsString)
		}
	}
}

void getSlice()
