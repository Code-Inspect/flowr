/**
 * The goal of this module is simply to streamline the creation of new scripts.
 *
 * @module
 */
import { scripts } from './scripts-info'
import commandLineUsage from 'command-line-usage'
import type { CommonOptions } from './options'
import { log, LogLevel } from '@eagleoutice/flowr/util/log'
import commandLineArgs from 'command-line-args'
import { italic } from '@eagleoutice/flowr/util/ansi'

/**
 * Just a helping data structure to allow the user to provide example usages of the respective script.
 * The subtitle will be displayed next to the title.
 */
export interface HelpContent {
	subtitle: string,
	examples: string[],
}

/**
 * Automatically generates a uniform help from a given script (see {@link scripts}).
 * Additionally, you can pass usage examples that may make use of the formatting instructions `{italic x}` and `{bold x}`.
 */
export function helpForOptions(script: keyof typeof scripts, content: HelpContent): string {
	return commandLineUsage([
		{
			header:  scripts[script].description,
			content: content.subtitle
		},
		{
			header:  'Synopsis',
			content: content.examples.map(e => `$ ${scripts[script].toolName} ${e}`)
		},
		{
			header:     'Options',
			optionList: scripts[script].options
		}
	])
}


export function processCommandLineArgs<T extends CommonOptions>(script: keyof typeof scripts, requireAdditionally: (keyof T)[], help: HelpContent): T {
	const options = commandLineArgs(scripts[script].options) as T

	if(options.help) {
		console.log(helpForOptions(script, help))
		process.exit(0)
	} else if(requireAdditionally.length > 0) {
		const keys = new Set(Object.keys(options))
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- we know that they are not given if undefined
		const missing = requireAdditionally.filter(k => !keys.has(k as string) || options[k] === undefined)
		if(missing.length > 0) {
			console.error(italic(`Missing required arguments: ${missing.join(', ')}. Showing help.`))
			console.log(helpForOptions(script, help))
			process.exit(0)
		}
	}

	log.updateSettings(l => l.settings.minLevel = options.verbose ? LogLevel.Trace : LogLevel.Error)

	if(options.verbose) {
		log.info(`running with (debugging) options, ${JSON.stringify(options)}`)
	}
	return options
}
