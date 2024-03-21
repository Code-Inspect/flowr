import type { CommonSummarizerConfiguration } from '@eagleoutice/flowr/util/summarizer'
import { Summarizer } from '@eagleoutice/flowr/util/summarizer'
import { getAllFiles } from '@eagleoutice/flowr/util/files'
import { list } from 'tar'
import { longestCommonPrefix } from '@eagleoutice/flowr/util/strings'
import fs from 'fs'
import path from 'path'
import type { FeatureSelection } from '../features'
import { date2string } from '@eagleoutice/flowr/util/time'
import { FileMigrator } from './first-phase/process'
import { postProcessFeatureFolder } from './second-phase/process'

export interface StatisticsSummarizerConfiguration extends CommonSummarizerConfiguration {
	/**
	 * The input path to read all zips from
	 */
	inputPath:              string
	/**
	 * Features to extract the summaries for
	 */
	featuresToUse:          FeatureSelection
	/**
	 * Path for the intermediate results of the preparation phase
	 */
	intermediateOutputPath: string
	/**
	 * Path for the final results of the summarization phase
	 */
	outputPath:             string,
	/**
	 * How many folders to skip to find the project root
	 */
	projectSkip:            number
}

export const statisticsFileNameRegex = /.*--.*\.tar\.gz$/

/**
 * The returned map contains the full path as key, mapping it to the complete contents.
 */
async function retrieveAllFilesInArchive(f: string): Promise<Map<string, string>> {
	const filenames = new Map<string, string>()
	const promises: Promise<void>[] = []
	list({
		file:    f,
		onentry: entry => {
			if(entry.type === 'File') {
				promises.push(
					entry.concat().then(content =>{
						filenames.set(entry.path, content.toString())
					})
				)
			}
		},
		sync: true
	})
	await Promise.all(promises)
	return filenames
}

function identifyCommonPrefix(files: Map<string,string>): string {
	return longestCommonPrefix([...files.keys()])
}


/** returns the target path */
async function extractArchive(f: string): Promise<Map<string,string>> {
	const files = await retrieveAllFilesInArchive(f)
	const commonRoot = identifyCommonPrefix(files)
	// post process until we find the '<filename>.(r|R)' suffix. otherwise, if there are no features and only the meta folder, the meta folder will be removed, resulting in a write
	// to the toplevel!
	const fname = path.basename(f).replace(/\.tar\.gz$/, '')
	const findIndex = commonRoot.indexOf(fname)
	const commonPart = findIndex < 0 ? commonRoot.length : findIndex + fname.length

	// transform all map keys by removing the common root
	const transformed = new Map<string, string>()
	for(const [key, value] of files.entries()) {
		transformed.set(key.slice(commonPart), value)
	}
	return transformed
}


// due to a redefinition after the initial statistic extraction, we extract the type from the remaining path :D
// original: /^([^-]*)---?(.+)\.tar.gz/
const filePrefixRegex = /^[^-]*---?(?<fullname>([^/]+)\/(?<pathtest>.+))\.tar\.gz$/
const testRegex = /.*test[-_]?(s|that|)\//i
/** if it starts with example-, this will return `'example'`, etc. if it starts with '--' this will return `undefined` */
function identifyExtractionType(path: string): { folder: string, originalFile: string } | undefined  {
	const match = filePrefixRegex.exec(path.replace(/／/g, '/'))
	if(match === null || match.groups === undefined) {
		return undefined
	}
	// recover
	const originalFile = match.groups.fullname
	let folder
	if(testRegex.test(match.groups.pathtest)) {
		folder = 'test'
	} else if(match.groups.pathtest.includes('example')) {
		folder = 'example'
	} else {
		folder = 'default'
	}
	return { folder, originalFile }
}


export class StatisticsSummarizer extends Summarizer<unknown, StatisticsSummarizerConfiguration> {
	public constructor(config: StatisticsSummarizerConfiguration) {
		super(config)
	}

	private removeIfExists(path?: string) {
		if(path && fs.existsSync(path)) {
			this.log(`Removing existing ${path}`)
			fs.rmSync(path, { recursive: true, force: true })
		}
	}

	/**
	 * The preparation phase essentially merges all files into one by just attaching lines together!
	 */
	public async preparationPhase(useTypeClassification: boolean): Promise<void> {
		this.removeIfExists(this.config.intermediateOutputPath)
		fs.mkdirSync(this.config.intermediateOutputPath, { recursive: true })

		let count = 0
		const migrator = new FileMigrator()
		for await (const f of getAllFiles(this.config.inputPath, /\.tar.gz$/)) {
			this.log(`[${count++}, ${date2string()}] processing file ${f} (to ${this.config.intermediateOutputPath})`)
			let target: Map<string,string>
			try {
				target = await extractArchive(f)
				this.log('    Collected!')
			} catch(e) {
				this.log(`    Failed to extract ${f}, skipping...`)
				continue
			}
			this.log('    Migrating files...')
			const extracted = identifyExtractionType(path.basename(f))
			await migrator.migrate(target,
				path.join(this.config.intermediateOutputPath, useTypeClassification ? extracted?.folder ?? 'default' : 'uncategorized'),
				extracted?.originalFile
			)

			this.log('    Done! (Cleanup...)')
		}
		migrator.finish()
		this.log(`Found ${count} files to summarize`)
		return Promise.resolve()
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- just to obey the structure
	public async summarizePhase(): Promise<unknown> {
		// detect all subfolders in the current folder (default, test...) for each: concat.
		this.removeIfExists(this.config.outputPath)
		fs.mkdirSync(this.config.outputPath, { recursive: true })
		const folders = fs.readdirSync(this.config.intermediateOutputPath, { recursive: false })
		for(const folder of folders) {
			const folderStr = String(folder)
			const output = path.join(this.config.outputPath, folderStr)
			const input = path.join(this.config.intermediateOutputPath, folderStr)
			this.log(`Summarizing for ${input} (target: ${output})`)
			postProcessFeatureFolder(this.log, input, this.config, output)
		}
		return Promise.resolve(undefined)
	}
}
