import { ReplCommand, ReplOutput } from './main'
import { RShell } from '../../../r-bridge'
import { version } from '../../../../package.json'
import { guard } from '../../../util/assert'

type Version = `${number}.${number}.${number}`

/**
 * Describes the version of the extractor and the used R interpreter.
 */
export interface VersionInformation {
	/** The version of the extractor */
	extractor: Version,
	/** The version of R identified by the underlying {@link RShell} */
	r:     Version | 'unknown'
}

const versionRegex = /^\d+\.\d+\.\d+/m

export async function retrieveVersionInformation(shell?: RShell): Promise<VersionInformation> {
	if(shell === undefined) {
		shell = new RShell()
		process.on('exit', () => (shell as RShell).close())
	}
	const extractor = version
	const r = (await shell.usedRVersion())?.format() ?? 'unknown'

	guard(versionRegex.test(extractor), `extractor version ${extractor} does not match the expected format!`)
	guard(r === 'unknown' || versionRegex.test(r), `R version ${r} does not match the expected format!`)

	return { extractor: extractor as Version, r: r as Version }
}

export async function printVersionInformation(output: ReplOutput, shell?: RShell) {
	const { extractor, r } = await retrieveVersionInformation(shell)
	output.stdout(`extractor: ${extractor}`)
	output.stdout(`R: ${r}`)
}


export const versionCommand: ReplCommand = {
	description:  'Prints the version of the extractor as well as the current version of R',
	aliases:      [],
	usageExample: ':version',
	script:       false,
	fn:           (output, shell) => printVersionInformation(output, shell)
}
