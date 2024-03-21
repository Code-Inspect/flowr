/**
 * Basically a helper file to allow the main 'flowr' script (located in the source root) to provide its repl
 *
 * @module
 */
import { fileProtocol, RShell } from '@eagleoutice/flowr/r-bridge'
import { bold } from '@eagleoutice/flowr/util/ansi'
import { prompt } from './prompt'
import type { ReplOutput } from './commands'
import { getCommandNames , getCommand, standardReplOutput } from './commands'
import * as readline from 'readline'
import { splitAtEscapeSensitive } from '@eagleoutice/flowr/util/args'
import { executeRShellCommand } from './commands/execute'
import os from 'os'
import path from 'path'
import fs from 'fs'
import { getValidOptionsForCompletion, scripts } from '../common'

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

async function replProcessStatement(output: ReplOutput, statement: string, shell: RShell) {
	if(statement.startsWith(':')) {
		const command = statement.slice(1).split(' ')[0].toLowerCase()
		const processor = getCommand(command)
		if(processor) {
			try {
				await processor.fn(output, shell, statement.slice(command.length + 2).trim())
			} catch(e){
				console.log(`${bold(`Failed to execute command ${command}`)}: ${(e as Error)?.message}. Using the ${bold('--verbose')} flag on startup may provide additional information.`)
			}
		} else {
			console.log(`the command '${command}' is unknown, try ${bold(':help')} for more information`)
		}
	} else {
		await executeRShellCommand(output, shell, statement)
	}
}

/**
 * This function interprets the given `expr` as a REPL command (see {@link repl} for more on the semantics).
 *
 * @param output   - Defines two methods that every function in the repl uses to output its data.
 * @param expr     - The expression to process.
 * @param shell    - The {@link RShell} to use (see {@link repl}).
 */
export async function replProcessAnswer(output: ReplOutput, expr: string, shell: RShell): Promise<void> {

	const statements = splitAtEscapeSensitive(expr, false, ';')

	for(const statement of statements) {
		await replProcessStatement(output, statement, shell)
	}
}

/**
 * Provides a never-ending repl (read-evaluate-print loop) processor that can be used to interact with a {@link RShell} as well as all flowR scripts.
 *
 * The repl allows for two kinds of inputs:
 * - Starting with a colon `:`, indicating a command (probe `:help`, and refer to {@link commands}) </li>
 * - Starting with anything else, indicating default R code to be directly executed. If you kill the underlying shell, that is on you! </li>
 *
 * @param shell     - The shell to use, if you do not pass one it will automatically create a new one with the `revive` option set to 'always'
 * @param rl        - A potentially customized readline interface to be used for the repl to *read* from the user, we write the output with the {@link ReplOutput | `output` } interface.
 *                    If you want to provide a custom one but use the same `completer`, refer to {@link replCompleter}.
 *                    For the default arguments, see {@link DEFAULT_REPL_READLINE_CONFIGURATION}.
 * @param output    - Defines two methods that every function in the repl uses to output its data.
 * @param historyFile - The file to use for persisting the repl's history. Passing undefined causes history not to be saved.
 *
 * For the execution, this function makes use of {@link replProcessAnswer}
 *
 */
export async function repl(shell = new RShell({ revive: 'always' }), rl = readline.createInterface(DEFAULT_REPL_READLINE_CONFIGURATION), output = standardReplOutput, historyFile: string | undefined = defaultHistoryFile) {
	if(historyFile) {
		rl.on('history', h => fs.writeFileSync(historyFile, h.join('\n'), { encoding: 'utf-8' }))
	}

	// the incredible repl :D, we kill it with ':quit'
	// eslint-disable-next-line no-constant-condition,@typescript-eslint/no-unnecessary-condition
	while(true) {
		await new Promise<void>((resolve, reject) => {
			rl.question(prompt(), answer => {
				rl.pause()
				replProcessAnswer(output, answer, shell).then(() => {
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
