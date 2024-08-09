import type { ReplCommand } from './main'
import { PipelineExecutor } from '../../../core/pipeline-executor'
import { extractCFG } from '../../../util/cfg/cfg'
import type { RShell } from '../../../r-bridge/shell'
import { DEFAULT_NORMALIZE_PIPELINE } from '../../../core/steps/pipeline/default-pipelines'
import { fileProtocol, requestFromInput } from '../../../r-bridge/retriever'
import { cfgToMermaid, cfgToMermaidUrl } from '../../../util/mermaid/cfg'

async function controlflow(shell: RShell, remainingLine: string) {
	return await new PipelineExecutor(DEFAULT_NORMALIZE_PIPELINE, {
		shell,
		request: requestFromInput(remainingLine.trim())
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
