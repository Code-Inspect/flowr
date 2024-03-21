import { type ILogObj, type ISettingsParam, Logger } from 'tslog'
import { createStream, type Options } from 'rotating-file-stream'

export class FlowrLogger extends Logger<ILogObj> {
	/** by keeping track of all children we can propagate updates of the settings (e.g., in tests) */
	private readonly childLoggers: Logger<ILogObj>[] = []

	public getSubLogger(
		settings?: ISettingsParam<ILogObj>,
		logObj?: ILogObj
	): Logger<ILogObj> {
		const newSubLogger = super.getSubLogger(settings, logObj)
		this.childLoggers.push(newSubLogger)
		return newSubLogger
	}

	public updateSettings(updater: (logger: Logger<ILogObj>) => void): void {
		updater(this)
		this.childLoggers.forEach((child) => {
			updater(child)
		})
	}

	/**
   * make the logger log to a file as well
   */
	public logToFile(
		filename = 'flowr.log',
		options: Options = {
			size:     '10M',
			interval: '1d',
			compress: 'gzip',
		}
	): void {
		const stream = createStream(filename, options)

		log.attachTransport((logObj) => {
			stream.write(`${JSON.stringify(logObj)}\n`)
		})
	}
}

// based on https://tslog.js.org/#/?id=minlevel
// noinspection JSUnusedGlobalSymbols
export const enum LogLevel {
	Silly = 0,
	Trace = 1,
	Debug = 2,
	Info = 3,
	Warn = 4,
	Error = 5,
	Fatal = 6
}

function getActiveLog(): FlowrLogger {
	return new FlowrLogger({
		// set the default minimum level as Warn, and let all apps
		// (like the REPL) update it to whatever they want it to be
		minLevel:        LogLevel.Warn,
		type:            'pretty',
		name:            'main',
		stylePrettyLogs: true,
		prettyLogStyles: {
			logLevelName: {
				'*': ['bold', 'black', 'dim']
			}
		}
	})
}

export const log: FlowrLogger = getActiveLog()
