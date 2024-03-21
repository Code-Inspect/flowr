import type { ReplCommand, ReplOutput } from './main'
import { RShell } from '@eagleoutice/flowr/r-bridge'
import { guard } from '@eagleoutice/flowr/util/assert'
import { flowrVersion } from '@eagleoutice/flowr/util/version'

type Version = `${number}.${number}.${number}`

/**
 * Describes the version of flowR and the used R interpreter.
 */
export interface VersionInformation {
	/** The version of flowR */
	flowr: Version,
	/** The version of R identified by the underlying {@link RShell} */
	r:     Version | 'unknown'
}

const versionRegex = /^\d+\.\d+\.\d+/m

export async function retrieveVersionInformation(shell?: RShell): Promise<VersionInformation> {
	if(shell === undefined) {
		shell = new RShell()
		process.on('exit', () => (shell as RShell).close())
	}
	const flowr = flowrVersion().toString()
	const r = (await shell.usedRVersion())?.format() ?? 'unknown'

	guard(versionRegex.test(flowr), `flowR version ${flowr} does not match the expected format!`)
	guard(r === 'unknown' || versionRegex.test(r), `R version ${r} does not match the expected format!`)

	return { flowr: flowr as Version, r: r as Version }
}

export async function printVersionInformation(output: ReplOutput, shell?: RShell) {
	const { flowr, r } = await retrieveVersionInformation(shell)
	output.stdout(`flowR: ${flowr}`)
	output.stdout(`R: ${r}`)
}


export const versionCommand: ReplCommand = {
	description:  'Prints the version of flowR as well as the current version of R',
	aliases:      [],
	usageExample: ':version',
	script:       false,
	fn:           (output, shell) => printVersionInformation(output, shell)
}
