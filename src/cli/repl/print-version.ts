import { retrieveVersionInformation } from './commands/version'
import type { RShell } from '../../r-bridge/shell'

export async function printVersionRepl(shell: RShell): Promise<void> {
	const version = await retrieveVersionInformation(shell)
	console.log(`flowR repl using flowR ${version.flowr}, R ${version.r}`)
}
