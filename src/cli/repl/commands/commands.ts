import { quitCommand } from './quit'
import { scripts } from '../../common'
import { stdioCaptureProcessor, waitOnScript } from '../execute'
import { splitAtEscapeSensitive } from '../../../util/args'
import type { ReplCommand } from './main'
import { rawPrompt } from '../prompt'
import type { OutputFormatter } from '../../../statistics'
import { bold, italic } from '../../../statistics'
import { versionCommand } from './version'
import { parseCommand } from './parse'
import { guard } from '../../../util/assert'
import { executeCommand } from './execute'
import { normalizeCommand, normalizeStarCommand } from './normalize'
import { dataflowCommand, dataflowStarCommand } from './dataflow'
import { controlflowCommand, controlflowStarCommand } from './cfg'

function printHelpForScript(script: [string, ReplCommand], f: OutputFormatter): string {
	const base = `  ${bold(padCmd(':' + script[0]), f)}${script[1].description}`
	if(script[1].aliases.length === 0) {
		return base
	}
	const aliases = script[1].aliases
	return `${base} (alias${aliases.length > 1 ? 'es' : ''}: ${aliases.map(a => bold(':' + a, f)).join(', ')})`
}

export const helpCommand: ReplCommand = {
	description:  'Show help information',
	script:       false,
	usageExample: ':help',
	aliases:      [ 'h', '?' ],
	fn:           output => {
		output.stdout(`
You can always just enter R expressions which get evaluated right away:
${rawPrompt} ${bold('1 + 1', output.formatter)}
${italic('[1] 2', output.formatter)}

Besides that, you can use the following commands. The scripts ${italic('can', output.formatter)} accept further arguments. There are the following basic commands:
${
	Array.from(Object.entries(commands)).filter(([, { script }]) => !script).map(
		c => printHelpForScript(c, output.formatter)).join('\n')
}

Furthermore, you can directly call the following scripts which accept arguments. If you are unsure, try to add ${italic('--help', output.formatter)} after the command.
${
	Array.from(Object.entries(commands)).filter(([, { script }]) => script).map(
		([command, { description }]) => `  ${bold(padCmd(':' + command), output.formatter)}${description}`).join('\n')
}

You can combine commands by separating them with a semicolon ${bold(';',output.formatter)}.
`)
	}
}

/**
 * All commands that should be available in the REPL.
 */
const commands: Record<string, ReplCommand> = {
	'help':         helpCommand,
	'quit':         quitCommand,
	'version':      versionCommand,
	'execute':      executeCommand,
	'parse':        parseCommand,
	'normalize':    normalizeCommand,
	'normalize*':   normalizeStarCommand,
	'dataflow':     dataflowCommand,
	'dataflow*':    dataflowStarCommand,
	'controlflow':  controlflowCommand,
	'controlflow*': controlflowStarCommand
}

for(const [script, { target, description, type }] of Object.entries(scripts)) {
	if(type === 'master script') {
		commands[script] = {
			description,
			aliases:      [],
			script:       true,
			usageExample: `:${script} --help`,
			fn:           async(output, _s, remainingLine) => {
				await waitOnScript(
					`${__dirname}/../../${target}`,
					splitAtEscapeSensitive(remainingLine),
					stdio => stdioCaptureProcessor(stdio, msg => output.stdout(msg), msg => output.stderr(msg))
				)
			}
		}
	}
}


/**
 * The names of all commands including their aliases (but without the leading `:`)
 */
// maps command names or aliases to the actual command name
const commandMapping: Record<string, string> = {}

export const commandNames: readonly string[] = Object.entries(commands).flatMap(([command, { aliases }]) => {
	guard(commandMapping[command] as string | undefined === undefined, `Command ${command} is already registered!`)
	commandMapping[command] = command
	for(const alias of aliases) {
		guard(commandMapping[alias] as string | undefined === undefined, `Command (alias) ${alias} is already registered!`)
		commandMapping[alias] = command
	}
	return [command, ...aliases]
})

/**
 * Get the command for a given command name or alias.
 * @param command - The name of the command (without the leading `:`)
 */
export function getCommand(command: string): ReplCommand | undefined {
	return commands[commandMapping[command]]
}


const longestKey = Array.from(Object.keys(commands), k => k.length).reduce((p, n) => Math.max(p, n), 0)
function padCmd<T>(string: T) {
	return String(string).padEnd(longestKey + 2, ' ')
}
