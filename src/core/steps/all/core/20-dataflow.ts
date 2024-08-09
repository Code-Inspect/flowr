import { internalPrinter, StepOutputFormat } from '../../../print/print'
import type { IPipelineStep } from '../../pipeline-step'
import { PipelineStepStage } from '../../pipeline-step'
import {
	dataflowGraphToJson,
	dataflowGraphToMermaid,
	dataflowGraphToMermaidUrl,
	dataflowGraphToQuads
} from '../../../print/dataflow-printer'
import type { DeepReadonly } from 'ts-essentials'
import type { NormalizedAst } from '../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RParseRequests } from '../../../../r-bridge/retriever'
import { produceDataFlowGraph } from '../../../../dataflow/extractor'

const staticDataflowCommon = {
	name:        'dataflow',
	description: 'Construct the dataflow graph',
	executed:    PipelineStepStage.OncePerFile,
	printer:     {
		[StepOutputFormat.Internal]:   internalPrinter,
		[StepOutputFormat.Json]:       dataflowGraphToJson,
		[StepOutputFormat.RdfQuads]:   dataflowGraphToQuads,
		[StepOutputFormat.Mermaid]:    dataflowGraphToMermaid,
		[StepOutputFormat.MermaidUrl]: dataflowGraphToMermaidUrl
	},
	dependencies: [ 'normalize' ],
} as const

function legacyProcessor(results: { normalize?: NormalizedAst }, input: { request?: RParseRequests }) {
	return produceDataFlowGraph(input.request as RParseRequests, results.normalize as NormalizedAst)
}

export const STATIC_DATAFLOW = {
	...staticDataflowCommon,
	humanReadableName: 'dataflow',
	processor:         legacyProcessor,
	requiredInput:     {
	}
} as const satisfies DeepReadonly<IPipelineStep<'dataflow', typeof legacyProcessor>>

