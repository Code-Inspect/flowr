import type { RShellExecutionOptions } from './shell'
import { DEFAULT_R_SHELL_OPTIONS } from './shell'
import { deepMergeObject } from '../util/objects'
import { spawnSync } from 'child_process'
import { ts2r } from './lang-4.x'
import type { SemVer } from 'semver'
import semver from 'semver/preload'
import { log, LogLevel } from '../util/log'

const executorLog = log.getSubLogger({ name: 'RShellExecutor' })

export class RShellExecutor {
	public readonly options:        Readonly<RShellExecutionOptions>
	private readonly prerequisites: string[] = []

	public constructor(options?: Partial<RShellExecutionOptions>) {
		this.options = deepMergeObject(DEFAULT_R_SHELL_OPTIONS, options)
	}

	public continueOnError(): this {
		executorLog.info('continue in case of Errors')
		this.addPrerequisites('options(error=function() {})')
		return this
	}

	public addPrerequisites(commands: string | string[]): this {
		this.prerequisites.push(...(typeof commands == 'string' ? [commands] : commands))
		return this
	}

	public usedRVersion(): SemVer | null{
		const version = this.run(`cat(paste0(R.version$major,".",R.version$minor), ${ts2r(this.options.eol)})`)
		executorLog.trace(`raw version: ${JSON.stringify(version)}`)
		return semver.coerce(version)
	}

	public run(command: string, returnErr = false): string {
		command += ';base::quit()'
		if(executorLog.settings.minLevel >= LogLevel.Trace) {
			executorLog.trace(`> ${JSON.stringify(command)}`)
		}

		const returns = spawnSync(this.options.pathToRExecutable, this.options.commandLineOptions, {
			env:         this.options.env,
			cwd:         this.options.cwd,
			windowsHide: true,
			encoding:    'utf8',
			input:       [...this.prerequisites, command].join(this.options.eol)
		})
		return (returnErr ? returns.stderr : returns.stdout).trim()
	}

}
