import type {
	IdGenerator,
	NoInfo
} from '../../../../r-bridge'
import { internalPrinter, StepOutputFormat } from '../../../print/print'
import {
	normalizedAstToJson,
	normalizedAstToQuads,
	printNormalizedAstToMermaid,
	printNormalizedAstToMermaidUrl
} from '../../../print/normalize-printer'
import type { IPipelineStep } from '../../step'
import { PipelineStepStage } from '../../step'
import type { DeepReadonly } from 'ts-essentials'
import type { ParseRequiredInput } from './00-parse'
import { normalize } from '../../../../r-bridge/lang-4.x/ast/parser/json/parser'

export interface NormalizeRequiredInput extends ParseRequiredInput {
	/** This id generator is only necessary if you want to retrieve a dataflow from the parsed R AST, it determines the id generator to use and by default uses the {@link deterministicCountingIdGenerator}*/
	readonly getId?: IdGenerator<NoInfo>
}

function processor(results: { parse?: string }, input: Partial<NormalizeRequiredInput>) {
	return normalize(results.parse as string, input.getId)
}

export const NORMALIZE = {
	name:              'normalize',
	humanReadableName: 'normalize',
	description:       'Normalize the AST to flowR\'s AST',
	processor,
	executed:          PipelineStepStage.OncePerFile,
	printer:           {
		[StepOutputFormat.Internal]:   internalPrinter,
		[StepOutputFormat.Json]:       normalizedAstToJson,
		[StepOutputFormat.RdfQuads]:   normalizedAstToQuads,
		[StepOutputFormat.Mermaid]:    printNormalizedAstToMermaid,
		[StepOutputFormat.MermaidUrl]: printNormalizedAstToMermaidUrl
	},
	dependencies:  [ 'parse' ],
	requiredInput: undefined as unknown as NormalizeRequiredInput
} as const satisfies DeepReadonly<IPipelineStep<'normalize', typeof processor>>


