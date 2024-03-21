import type { ReplCommand } from './main'
import { SteppingSlicer } from '@eagleoutice/flowr/core'
import type { RShell } from '@eagleoutice/flowr/r-bridge'
import { fileProtocol , requestFromInput } from '@eagleoutice/flowr/r-bridge'
import { extractCFG } from '@eagleoutice/flowr/util/cfg/cfg'
import { cfgToMermaid, cfgToMermaidUrl } from '@eagleoutice/flowr/util/mermaid'

async function controlflow(shell: RShell, remainingLine: string) {
	return await new SteppingSlicer({
		stepOfInterest: 'normalize',
		shell,
		request:        requestFromInput(remainingLine.trim())
	}).allRemainingSteps()
}

export const controlflowCommand: ReplCommand = {
	description:  `Get mermaid code for the control-flow graph of R code, start with '${fileProtocol}' to indicate a file`,
	usageExample: ':controlflow',
	aliases:      [ 'cfg', 'cf' ],
	script:       false,
	fn:           async(output, shell, remainingLine) => {
		const result = await controlflow(shell, remainingLine)

		const cfg = extractCFG(result.normalize)
		output.stdout(cfgToMermaid(cfg, result.normalize))
	}
}

export const controlflowStarCommand: ReplCommand = {
	description:  `Get a mermaid url of the control-flow graph of R code, start with '${fileProtocol}' to indicate a file`,
	usageExample: ':controlflow',
	aliases:      [ 'cfg*', 'cf*' ],
	script:       false,
	fn:           async(output, shell, remainingLine) => {
		const result = await controlflow(shell, remainingLine)

		const cfg = extractCFG(result.normalize)
		output.stdout(cfgToMermaidUrl(cfg, result.normalize))
	}
}
