import fs from 'fs'
import path from 'path'
import { guard } from '../../../util/assert'
import type { StatisticsOutputFormat } from '../../output/statistics-file'

export class FileMigrator {
	private readonly writeHandles = new Map<string, fs.WriteStream>()
	private finished = false

	public async migrate(sourceFolderContent: Map<string,string>, targetFolder: string, originalFile: string | undefined): Promise<void> {
		guard(!this.finished, () => 'migrator is already marked as finished!')
		if(!fs.existsSync(targetFolder)) {
			fs.mkdirSync(targetFolder, { recursive: true })
		}

		const promises: Promise<void>[] = []
		for(const [filepath, content] of sourceFolderContent.entries()) {
			const target = path.join(targetFolder, filepath)

			let targetStream = this.writeHandles.get(target)
			if(targetStream === undefined) {
				if(!fs.existsSync(path.dirname(target))) {
					fs.mkdirSync(path.dirname(target), { recursive: true })
				}
				targetStream = fs.createWriteStream(target, { flags: 'a' })
				this.writeHandles.set(target, targetStream)
			}
			// before we write said content we have to group {value: string, context: string} by context (while we can safely assume that there is only one context per file,
			// i want to be sure
			let data: string
			// regex matches failed due to encoding errors
			if(filepath.endsWith('meta/stats.txt') || filepath.endsWith('meta/features.txt')) {
				data = `{"file":"${originalFile ?? ''}","content":${content.trimEnd()}}\n`
			} else {
				const grouped = groupByContext(content)
				data = grouped === undefined ? content : grouped.map(s => JSON.stringify(s)).join('\n') + '\n'
			}
			promises.push(new Promise((resolve, reject) => targetStream.write(data, 'utf-8', err => {
				if(err) {
					reject(err)
				} else {
					resolve()
				}
			})))
		}
		await Promise.all(promises)
	}

	public finish() {
		for(const handle of this.writeHandles.values()) {
			handle.close()
		}
		this.finished = true
	}
}

function groupByContext(input: string | undefined): StatisticsOutputFormat<never[]>[] | undefined {
	if(input === undefined) {
		return []
	}
	const parsed = input.split('\n').filter(s => s && s !== '').map(s => JSON.parse(s) as StatisticsOutputFormat<never>)
	const grouped = new Map<string|undefined, never[]>()
	for(const content of parsed) {
		if(!Array.isArray(content)) {
			// in this case it is a meta file or other which does not have to be grouped
			return undefined
		}
		const [value, context] = content
		const get = grouped.get(context)
		if(get === undefined) {
			grouped.set(context, [value])
		} else {
			get.push(value)
		}
	}
	return [...grouped.entries()].map(([context, values]) => [values, context])
}
