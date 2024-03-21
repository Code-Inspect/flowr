import type { RShell } from '@eagleoutice/flowr/r-bridge'
import type { OutputFormatter } from '@eagleoutice/flowr/util/ansi'
import { formatter } from '@eagleoutice/flowr/util/ansi'

/**
 * Defines the main interface for output of the repl.
 * This allows us to redirect it (e.g., in the case of a server connection or tests).
 *
 * The formatter allows to dynamically change the use of ansi escape sequences (see {@link OutputFormatter})
 *
 * @see standardReplOutput
 */
export interface ReplOutput {
	formatter: OutputFormatter
	stdout(msg: string): void
	stderr(msg: string): void
}

/**
 * Default repl output that redirects everything to the stdout and stderror channels (linked to `console`).
 * @see ReplOutput
 */
export const standardReplOutput: ReplOutput = {
	formatter: formatter,
	stdout:    console.log,
	stderr:    console.error
}

/**
 * Content of a single command in the repl.
 * The command may execute an external script or simply call *flowR* functions.
 */
export interface ReplCommand {
	/** Aliases of the command (without the leading colon), every alias must be unique (this is checked at runtime) */
	aliases:      string[]
	/** A human-readable description of what the command does */
	description:  string
	/** Does the command invoke another script? this is mainly used to automatically generate two separate lists when asking for help */
	script:       boolean
	/** Example of how to use the command, for example `:slicer --help` */
	usageExample: string
	/**
	 * Function to execute when the command is invoked, it must not write to the command line but instead use the output handler.
	 * Furthermore, it has to obey the formatter defined in the {@link ReplOutput}.
	 */
	fn:           (output: ReplOutput, shell: RShell, remainingLine: string) => Promise<void> | void
}
