import path from 'path'
import fs from 'fs'
import { guard } from '@eagleoutice/flowr/util/assert'
import { log, LogLevel } from '@eagleoutice/flowr/util/log'

type FileDescriptor = number
export type AppendFnType = string | number | symbol

export interface StatisticAppendProvider {
	append(name: string, fn: AppendFnType, content: string): void
}

export type DummyAppendMemoryMap = Map<string,Map<AppendFnType, string[]>>

export class DummyAppendProvider implements StatisticAppendProvider {
	private readonly map: DummyAppendMemoryMap | undefined

	/**
	 * If you pass a map the dummy will log all append calls to the map, using the feature name and the appendage type as keys
	 *
	 * @param map - The map to log to
	 */
	constructor(map: DummyAppendMemoryMap | undefined = undefined) {
		this.map = map
	}

	append(name: string, fn: AppendFnType, content: string): void {
		if(log.settings.minLevel >= LogLevel.Trace) {
			log.trace(`DummyAppendProvider: ${name} ${String(fn)} ${content}`)
		}
		if(this.map) {
			const fnMap = this.map.get(name)
			const contentArr = content.split('\n')
			if(fnMap) {
				const contentList = fnMap.get(fn)
				if(contentList) {
					contentList.push(...contentArr)
				} else {
					// just in case the map already had some entries
					fnMap.set(fn, contentArr)
				}
			} else {
				this.map.set(name, new Map([[ fn, contentArr ]]))
			}
		}
	}
}

export const defaultStatisticsFileSuffix = '.txt'

/**
 * Provides cached open connections for all files to connect.
 * allowing to append to the same file often.
 * <p>
 * While we could simply reopen these files, it is safer/more performant to keep the connection open.
 */
export class StatisticFileProvider implements StatisticAppendProvider{
	public readonly statisticsDirectory: string
	private readonly connections = new Map<string, FileDescriptor>()

	constructor(statisticsDirectory: string | undefined)  {
		guard(statisticsDirectory !== undefined, 'Please supply an output directory!')
		this.statisticsDirectory = statisticsDirectory

		// just to make sure, that they are closed
		process.on('beforeExit', () => {
			this.connections.forEach(fd => {
				fs.closeSync(fd)
			})
		})
	}

	/**
   * @param name - the name of the feature {@link Feature#name}
   * @param fn - the name of the feature-aspect to record
   */
	private statisticsFile(name: string, fn: string): string {
		return path.join(this.statisticsDirectory, name, `${fn}${defaultStatisticsFileSuffix}`)
	}

	/**
   * Append the given content to the information for a feature of the given name and function.
   */
	public append(name: string, fn: AppendFnType, content: string): void {
		const descriptor = this.getHandle(name, String(fn))
		fs.appendFileSync(descriptor, content + '\n', 'utf8')
	}

	private getHandle(name: string, fn: string): FileDescriptor {
		const key = `${name}-${fn}`
		const fileHandle = this.connections.get(key)
		if(fileHandle) {
			return fileHandle
		}

		// open the connection and ensure the location
		const filepath = this.statisticsFile(name, String(fn))

		const dirpath = path.dirname(filepath)
		if(!fs.existsSync(dirpath)) {
			fs.mkdirSync(dirpath, { recursive: true })
		}
		const fileDescriptor = fs.openSync(filepath, 'a')
		this.connections.set(key, fileDescriptor)
		return fileDescriptor
	}
}
