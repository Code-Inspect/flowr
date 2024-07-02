import type { ReplCommand, ReplOutput } from './main'
import { italic } from '../../../util/ansi'
import type { RShell } from '../../../r-bridge/shell'


export async function executeRShellCommand(output: ReplOutput, shell: RShell, statement: string) {
	try {
		const result = await shell.sendCommandWithOutput(statement, {
			from:                    'both',
			automaticallyTrimOutput: true
		})
		output.stdout(`${italic(result.join('\n'), output.formatter)}\n`)
	} catch(e) {
		output.stderr(`Error while executing '${statement}': ${(e as Error).message}`)
	}
}


export const executeCommand: ReplCommand = {
	description:  'Execute the given code as R code (essentially similar to using now command)',
	usageExample: ':execute',
	aliases:      [ 'e', 'r' ],
	script:       false,
	fn:           async(output, shell, remainingLine) => {
		await executeRShellCommand(output, shell, remainingLine)
	}
}
