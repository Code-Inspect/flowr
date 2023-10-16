import { SummarizerType } from './summarizer'
import fs from 'fs'
import { log } from '../log'

const statisticsRegex = /.*--.*\.tar\.gz$/

export async function detectSummarizationType(inputPath: string): Promise<SummarizerType> {
	if(fs.statSync(inputPath).isFile()) {
		log.info(`Detected benchmark summarization with single file ${inputPath}`)
		return SummarizerType.Benchmark
	}
	// current heuristic: search for a tar.gz with two minus signs :D
	const dir = await fs.promises.opendir(inputPath)
	const thresholdInit = 30
	let threshold = thresholdInit
	for await (const dirent of dir) {
		if(statisticsRegex.test(dirent.name)) {
			log.info(`Detected statistics summarization by file ${dirent.name} matching ${statisticsRegex.source}`)
			return SummarizerType.Statistics
		} else if(threshold-- < 0){
			break
		}
	}
	log.info(`Detected benchmark summarization with no file (first ${thresholdInit}) matching ${statisticsRegex.source}`)
	return SummarizerType.Benchmark
}
