/**
 * Basically a helper file to allow the main 'flowr' script (located in the source root) to provide its repl
 *
 * @module
 */
import { getStoredTokenMap, RShell, TokenMap } from '../../r-bridge'
import readline from 'readline/promises'
import { bold, italic } from '../../statistics'
import { prompt } from './prompt'
import { commands, ReplCommand } from './commands'




const replCompleterKeywords = Array.from(Object.keys(commands), s => `:${s}`)

/**
 * Used by the repl to provide automatic completions for a given (partial) input line
 */
export function replCompleter(line: string): [string[], string] {
	return [replCompleterKeywords.filter(k => k.startsWith(line)), line]
}

/**
 * Provides a never-ending repl (read-evaluate-print loop) processor that can be used to interact with a {@link RShell} as well as all flowR scripts.
 *
 * The repl allows for two kinds of inputs:
 * - Starting with a colon `:`, indicating a command (probe `:help`, and refer to {@link commands}) </li>
 * - Starting with anything else, indicating default R code to be directly executed. If you kill the underlying shell, that is on you! </li>
 *
 * @param shell     - The shell to use, if you do not pass one it will automatically create a new one with the `revive` option set to 'always'
 * @param tokenMap  - The pre-retrieved token map, if you pass none, it will be retrieved automatically (using the default {@link getStoredTokenMap}).
 * @param rl        - A potentially customized readline interface to be used for the repl to *read* from the user, we write the output with `console.log`.
 *                    If you want to provide a custom one but use the same `completer`, refer to {@link replCompleter}.
 */
export async function repl(shell = new RShell({ revive: 'always' }), tokenMap?: TokenMap, rl = readline.createInterface({
	input:                   process.stdin,
	output:                  process.stdout,
	tabSize:                 4,
	terminal:                true,
	removeHistoryDuplicates: true,
	completer:               replCompleter
})) {

	tokenMap ??= await getStoredTokenMap(shell)

	// the incredible repl :D, we kill it with ':quit'
	// eslint-disable-next-line no-constant-condition,@typescript-eslint/no-unnecessary-condition
	while(true) {
		const answer: string = await rl.question(prompt())

		if(answer.startsWith(':')) {
			const command = answer.slice(1).split(' ')[0].toLowerCase()
			const processor = commands[command] as (ReplCommand | undefined)
			if(processor) {
				await processor.fn(shell, tokenMap, answer.slice(command.length + 2).trim())
			} else {
				console.log(`the command '${command}' is unknown, try ${bold(':help')} for more information`)
			}
		} else {
			try {
				const result = await shell.sendCommandWithOutput(answer, {
					from:                    'both',
					automaticallyTrimOutput: true
				})
				console.log(`${italic(result.join('\n'))}\n`)
			} catch(e) {
				console.error(`Error while executing '${answer}': ${(e as Error).message}`)
			}
		}
	}
}