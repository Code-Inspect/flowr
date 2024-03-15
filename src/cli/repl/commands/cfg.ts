import type { ReplCommand } from './main'
import type { RShell } from '../../../r-bridge'
import { requestFromInput } from '../../../r-bridge'
import { extractCFG } from '../../../util/cfg/cfg'
import { cfgToMermaid, cfgToMermaidUrl } from '../../../util/mermaid'
import { SteppingSlicer } from '../../../core/stepping-slicer'

async function controlflow(shell: RShell, remainingLine: string) {
	return await new SteppingSlicer({
		stepOfInterest: 'normalize',
		shell,
		request:        requestFromInput(remainingLine.trim())
	}).allRemainingSteps()
}

export const controlflowCommand: ReplCommand = {
	description:  'Get mermaid code for the control-flow graph of R code, start with \'file://\' to indicate a file',
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
	description:  'Get a mermaid url of the control-flow graph of R code, start with \'file://\' to indicate a file',
	usageExample: ':controlflow',
	aliases:      [ 'cfg*', 'cf*' ],
	script:       false,
	fn:           async(output, shell, remainingLine) => {
		const result = await controlflow(shell, remainingLine)

		const cfg = extractCFG(result.normalize)
		output.stdout(cfgToMermaidUrl(cfg, result.normalize))
	}
}
