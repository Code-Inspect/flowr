/**
 * Basically a helper file to allow the main 'flowr' script (located in the source root) to provide its repl
 *
 * @module
 */
import { RShell, RShellReviveOptions } from '../../r-bridge'
import { bold } from '../../statistics'
import { prompt } from './prompt'
import type { ReplOutput } from './commands'
import { commandNames, getCommand, standardReplOutput } from './commands'
import * as readline from 'readline'
import { splitAtEscapeSensitive } from '../../util/args'
import { executeRShellCommand } from './commands/execute'
import os from 'os'
import path from 'path'
import fs from 'fs'

const replCompleterKeywords = Array.from(commandNames, s => `:${s}`)
const defaultHistoryFile = path.join(os.tmpdir(), '.flowrhistory')

/**
 * Used by the repl to provide automatic completions for a given (partial) input line
 */
export function replCompleter(line: string): [string[], string] {
	return [replCompleterKeywords.filter(k => k.startsWith(line)), line]
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
			await processor.fn(output, shell, statement.slice(command.length + 2).trim())
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
 * @param shell       - The shell to use, if you do not pass one it will automatically create a new one with the `revive` option set to 'always'
 * @param rl          - A potentially customized readline interface to be used for the repl to *read* from the user, we write the output with the {@link ReplOutput|`output` } interface.
 *                      If you want to provide a custom one but use the same `completer`, refer to {@link replCompleter}.
 *                      For the default arguments, see {@link DEFAULT_REPL_READLINE_CONFIGURATION}.
 * @param output      - Defines two methods that every function in the repl uses to output its data.
 * @param historyFile - The file to use for persisting the repl's history. Passing undefined causes history not to be saved.
 *
 * For the execution, this function makes use of {@link replProcessAnswer}
 */
export async function repl(shell = new RShell({ revive: RShellReviveOptions.Always }), rl = readline.createInterface(DEFAULT_REPL_READLINE_CONFIGURATION), output = standardReplOutput, historyFile: string | undefined = defaultHistoryFile) {
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
