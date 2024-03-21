/**
 * The main script to run flowR.
 *
 * If started with arguments it may be used to run a single of the flowR scripts.
 * Otherwise, it will start a REPL that can call these scripts and return their results repeatedly.
 */
import { log, LogLevel } from '@eagleoutice/flowr/util/log'
import type { RShellOptions } from '@eagleoutice/flowr/r-bridge'
import { RShell } from '@eagleoutice/flowr/r-bridge'
import type { OptionDefinition } from 'command-line-usage'
import commandLineUsage from 'command-line-usage'
import commandLineArgs from 'command-line-args'
import { guard } from '@eagleoutice/flowr/util/assert'
import { bold, ColorEffect, Colors, FontStyles, formatter, italic, setFormatter, voidFormatter } from '@eagleoutice/flowr/util/ansi'
import { repl, replProcessAnswer, waitOnScript } from './repl'
import type { ScriptInformation } from './common'
import { scripts } from './common'
import type { DeepReadonly } from 'ts-essentials'
import { printVersionInformation } from './repl/commands/version'
import { FlowRServer } from './repl/server/server'
import { standardReplOutput } from './repl/commands'
import type { Server } from './repl/server/net'
import { NetServer, WebSocketServerWrapper } from './repl/server/net'
import { defaultConfigFile, setConfigFile } from '@eagleoutice/flowr/config'
import { flowrVersion } from '@eagleoutice/flowr/util/version'
import { version } from '../package.json'

const scriptsText = Array.from(Object.entries(scripts).filter(([, { type }]) => type === 'master script'), ([k,]) => k).join(', ')

export const toolName = 'flowr'

export const optionDefinitions: OptionDefinition[] = [
	{ name: 'verbose',      alias: 'v', type: Boolean, description: 'Run with verbose logging (will be passed to the corresponding script)' },
	{ name: 'help',         alias: 'h', type: Boolean, description: 'Print this usage guide (or the guide of the corresponding script)' },
	{ name: 'version',      alias: 'V', type: Boolean, description: 'Provide information about the version of flowR as well as its underlying R system and exit.' },
	{ name: 'server',                   type: Boolean, description: 'Do not drop into a repl, but instead start a server on the given port (default: 1042) and listen for messages.' },
	{ name: 'ws',                       type: Boolean, description: 'If the server flag is set, use websocket for messaging' },
	{ name: 'port' ,                    type: Number,  description: 'The port to listen on, if --server is given.', defaultValue: 1042, typeLabel: '{underline port}' },
	{ name: 'execute',      alias: 'e', type: String,  description: 'Execute the given command and exit. Use a semicolon ";" to separate multiple commands.', typeLabel: '{underline command}', multiple: false },
	{ name: 'no-ansi',                  type: Boolean, description: 'Disable ansi-escape-sequences in the output. Useful, if you want to redirect the output to a file.' },
	{ name: 'script',       alias: 's', type: String,  description: `The sub-script to run (${scriptsText})`, multiple: false, defaultOption: true, typeLabel: '{underline files}', defaultValue: undefined },
	{ name: 'config-file', type: String, description: 'The name of the configuration file to use', multiple: false },
	{ name: 'r-path', type: String, description: 'The path to the R executable to use. Defaults to your PATH.', multiple: false }
]

export interface FlowrCliOptions {
	verbose:       boolean
	version:       boolean
	help:          boolean
	server:        boolean
	ws:            boolean
	port:          number
	'no-ansi':     boolean
	execute:       string | undefined
	script:        string | undefined
	'config-file': string
	'r-path':      string | undefined
}

export const optionHelp = [
	{
		header:  `flowR (version ${flowrVersion()}, cli version ${version})`,
		content: 'A static dataflow analyzer and program slicer for R programs'
	},
	{
		header:  'Synopsis',
		content: [
			`$ ${toolName} {bold --help}`,
			`$ ${toolName} {bold --version}`,
			`$ ${toolName} {bold --server}`,
			`$ ${toolName} {bold --execute} {italic ":parse 2 - 4"}`,
			`$ ${toolName} {bold slicer} {bold --help}`,
		]
	},
	{
		header:     'Options',
		optionList: optionDefinitions
	}
]

const options = commandLineArgs(optionDefinitions) as FlowrCliOptions

log.updateSettings(l => l.settings.minLevel = options.verbose ? LogLevel.Trace : LogLevel.Error)
log.info('running with options', options)

if(options['no-ansi']) {
	log.info('disabling ansi colors')
	setFormatter(voidFormatter)
}

setConfigFile(undefined, options['config-file'] ?? defaultConfigFile, true)

function retrieveShell(): RShell {
	// we keep an active shell session to allow other parse investigations :)
	let opts: Partial<RShellOptions> = {
		revive:   'always',
		onRevive: (code, signal) => {
			const signalText = signal == null ? '' : ` and signal ${signal}`
			console.log(formatter.format(`R process exited with code ${code}${signalText}. Restarting...`, { color: Colors.Magenta, effect: ColorEffect.Foreground }))
			console.log(italic(`If you want to exit, press either Ctrl+C twice, or enter ${bold(':quit')}`))
		}
	}
	if(options['r-path']) {
		opts = { ...opts, pathToRExecutable: options['r-path'] }
	}
	return new RShell(opts)
}

async function mainRepl() {
	if(options.script) {
		let target = (scripts as DeepReadonly<Record<string, ScriptInformation>>)[options.script].target as string | undefined
		guard(target !== undefined, `Unknown script ${options.script}, pick one of ${scriptsText}.`)
		console.log(`Running script '${formatter.format(options.script, { style: FontStyles.Bold })}'`)
		target = `cli/${target}`
		log.debug(`Script maps to "${target}"`)
		await waitOnScript(`${__dirname}/${target}`, process.argv.slice(3), undefined, true)
		process.exit(0)
	}

	if(options.help) {
		console.log(commandLineUsage(optionHelp))
		process.exit(0)
	}

	if(options.version) {
		await printVersionInformation(standardReplOutput)
		process.exit(0)
	}

	const shell = retrieveShell()

	const end = () => {
		if(options.execute === undefined) {
			console.log(`\n${italic('Exiting...')}`)
		}
		shell.close()
		process.exit(0)
	}

	// hook some handlers
	process.on('SIGINT', end)
	process.on('SIGTERM', end)

	if(options.execute) {
		await replProcessAnswer(standardReplOutput, options.execute, shell)
	} else {
		await repl(shell)
	}
	process.exit(0)
}

async function mainServer(backend: Server = new NetServer()) {
	const shell = retrieveShell()

	const end = () => {
		if(options.execute === undefined) {
			console.log(`\n${italic('Exiting...')}`)
		}
		shell.close()
		process.exit(0)
	}

	// hook some handlers
	process.on('SIGINT', end)
	process.on('SIGTERM', end)
	await new FlowRServer(shell, backend).start(options.port)
}


if(options.server) {
	void mainServer(options.ws ? new WebSocketServerWrapper() : new NetServer())
} else {
	void mainRepl()
}
