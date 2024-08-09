/**
 * Basically a helper file to allow the main 'flowr' script (located in the source root) to provide its repl
 *
 * @module
 */
import { prompt } from './prompt'
import * as readline from 'readline'
import { executeRShellCommand } from './commands/execute'
import os from 'os'
import path from 'path'
import fs from 'fs'
import { splitAtEscapeSensitive } from '../../util/args'
import { ColorEffect, Colors, FontStyles } from '../../util/ansi'
import { getCommand, getCommandNames } from './commands/commands'
import { getValidOptionsForCompletion, scripts } from '../common/scripts-info'
import { fileProtocol } from '../../r-bridge/retriever'
import type { ReplOutput } from './commands/main'
import { standardReplOutput } from './commands/main'
import { RShell, RShellReviveOptions } from '../../r-bridge/shell'
import type { MergeableRecord } from '../../util/objects'

let _replCompleterKeywords: string[] | undefined = undefined
function replCompleterKeywords() {
	if(_replCompleterKeywords === undefined) {
		_replCompleterKeywords = Array.from(getCommandNames(), s => `:${s}`)
	}
	return _replCompleterKeywords
}
const defaultHistoryFile = path.join(os.tmpdir(), '.flowrhistory')

/**
 * Used by the repl to provide automatic completions for a given (partial) input line
 */
export function replCompleter(line: string): [string[], string] {
	const splitLine = splitAtEscapeSensitive(line)
	// did we just type a space (and are starting a new arg right now)?
	const startingNewArg = line.endsWith(' ')

	// if we typed a command fully already, autocomplete the arguments
	if(splitLine.length > 1 || startingNewArg){
		const commandNameColon = replCompleterKeywords().find(k => splitLine[0] === k)
		if(commandNameColon) {
			const completions: string[] = []

			const commandName = commandNameColon.slice(1)
			if(getCommand(commandName)?.script === true){
				// autocomplete script arguments
				const options = scripts[commandName as keyof typeof scripts].options
				completions.push(...getValidOptionsForCompletion(options, splitLine).map(o => `${o} `))
			} else {
				// autocomplete command arguments (specifically, autocomplete the file:// protocol)
				completions.push(fileProtocol)
			}

			// add an empty option so that it doesn't autocomplete the only defined option immediately
			completions.push(' ')

			const currentArg = startingNewArg ? '' : splitLine[splitLine.length - 1]
			return [completions.filter(a => a.startsWith(currentArg)), currentArg]
		}
	}

	// if no command is already typed, just return all commands that match
	return [replCompleterKeywords().filter(k => k.startsWith(line)).map(k => `${k} `), line]
}

export const DEFAULT_REPL_READLINE_CONFIGURATION: readline.ReadLineOptions = {
	input:                   process.stdin,
	output:                  process.stdout,
	tabSize:                 4,
	terminal:                true,
	history:                 loadReplHistory(defaultHistoryFile),
	removeHistoryDuplicates: true,
	completer:               replCompleter
}

async function replProcessStatement(output: ReplOutput, statement: string, shell: RShell, allowRSessionAccess: boolean): Promise<void> {
	if(statement.startsWith(':')) {
		const command = statement.slice(1).split(' ')[0].toLowerCase()
		const processor = getCommand(command)
		const bold = (s: string) => output.formatter.format(s, { style: FontStyles.Bold })
		if(processor) {
			try {
				await processor.fn(output, shell, statement.slice(command.length + 2).trim())
			} catch(e){
				output.stdout(`${bold(`Failed to execute command ${command}`)}: ${(e as Error)?.message}. Using the ${bold('--verbose')} flag on startup may provide additional information.\n`)
			}
		} else {
			output.stdout(`the command '${command}' is unknown, try ${bold(':help')} for more information\n`)
		}
	} else if(allowRSessionAccess) {
		await executeRShellCommand(output, shell, statement)
	} else {
		output.stderr(`${output.formatter.format('You are not allowed to execute arbitrary R code.', { style: FontStyles.Bold, color: Colors.Red, effect: ColorEffect.Foreground })}\nIf you want to do so, please restart flowR with the ${output.formatter.format('--r-session-access', { style: FontStyles.Bold })}  flag. Please be careful of the security implications of this action.`)
	}
}

/**
 * This function interprets the given `expr` as a REPL command (see {@link repl} for more on the semantics).
 *
 * @param output              - Defines two methods that every function in the repl uses to output its data.
 * @param expr                - The expression to process.
 * @param shell               - The {@link RShell} to use (see {@link repl}).
 * @param allowRSessionAccess - If true, allows the execution of arbitrary R code.
 */
export async function replProcessAnswer(output: ReplOutput, expr: string, shell: RShell, allowRSessionAccess: boolean): Promise<void> {

	const statements = splitAtEscapeSensitive(expr, false, ';')

	for(const statement of statements) {
		await replProcessStatement(output, statement, shell, allowRSessionAccess)
	}
}

export interface FlowrReplOptions extends MergeableRecord {
	readonly shell?:               RShell
	readonly rl?:                  readline.Interface
	readonly output?:              ReplOutput
	readonly historyFile?:         string
	readonly allowRSessionAccess?: boolean
}

/**
 * Provides a never-ending repl (read-evaluate-print loop) processor that can be used to interact with a {@link RShell} as well as all flowR scripts.
 *
 * The repl allows for two kinds of inputs:
 * - Starting with a colon `:`, indicating a command (probe `:help`, and refer to {@link commands}) </li>
 * - Starting with anything else, indicating default R code to be directly executed. If you kill the underlying shell, that is on you! </li>
 *
 * @param shell               - The shell to use, if you do not pass one it will automatically create a new one with the `revive` option set to 'always'
 * @param rl                  - A potentially customized readline interface to be used for the repl to *read* from the user, we write the output with the {@link ReplOutput | `output` } interface.
 *                              If you want to provide a custom one but use the same `completer`, refer to {@link replCompleter}.
 *                              For the default arguments, see {@link DEFAULT_REPL_READLINE_CONFIGURATION}.
 * @param output              - Defines two methods that every function in the repl uses to output its data.
 * @param historyFile         - The file to use for persisting the repl's history. Passing undefined causes history not to be saved.
 * @param allowRSessionAccess - If true, allows the execution of arbitrary R code. This is a security risk, as it allows the execution of arbitrary R code.
 * 
 * For the execution, this function makes use of {@link replProcessAnswer}
 *
 */
export async function repl({
	shell = new RShell({ revive: RShellReviveOptions.Always }), 
	rl = readline.createInterface(DEFAULT_REPL_READLINE_CONFIGURATION), 
	output = standardReplOutput, 
	historyFile = defaultHistoryFile,
	allowRSessionAccess = false
}: FlowrReplOptions) {
	if(historyFile) {
		rl.on('history', h => fs.writeFileSync(historyFile, h.join('\n'), { encoding: 'utf-8' }))
	}

	// the incredible repl :D, we kill it with ':quit'
	// eslint-disable-next-line no-constant-condition,@typescript-eslint/no-unnecessary-condition
	while(true) {
		await new Promise<void>((resolve, reject) => {
			rl.question(prompt(), answer => {
				rl.pause()
				replProcessAnswer(output, answer, shell, allowRSessionAccess).then(() => {
					rl.resume()
					resolve()
				}).catch(reject)
			})
		})
	}
}

export function loadReplHistory(historyFile: string): string[] | undefined {
	if(!fs.existsSync(historyFile)) {
		return undefined
	}
	return fs.readFileSync(historyFile, { encoding: 'utf-8' }).split('\n')
}
