/**
 * This file defines *all* steps of the slicing process and the data they require.
 *
 * Note, that the order of elements here also describes the *desired* order of their desired execution for readability.
 * However, it is the {@link SteppingSlicer} which controls the order of execution and the steps required to achieve a given result.
 *
 * If you add a new step, you have to (at least) update the {@link SteppingSlicer} as well as the corresponding type predicate {@link SteppingSlicerInput}.
 * Furthermore, if your step is the new *last* step, please update {@link LAST_STEP}.
 *
 * Please note that the combination of `satisfies` and `as` seems to be required.
 * With `satisfies` we make sure that the respective element has all the keys it requires, and the `as` force the type to be exactly the given one
 *
 * @module
 */

import type { MergeableRecord } from '../util/objects'
import type { IPipelineStepPrinter } from './print/print'
import { internalPrinter, StepOutputFormat } from './print/print'
import {
	normalizedAstToJson,
	normalizedAstToQuads,
	printNormalizedAstToMermaid,
	printNormalizedAstToMermaidUrl
} from './print/normalize-printer'
import { guard } from '../util/assert'
import { parseToQuads } from './print/parse-printer'
import {
	dataflowGraphToJson,
	dataflowGraphToMermaid,
	dataflowGraphToMermaidUrl,
	dataflowGraphToQuads
} from './print/dataflow-printer'
import type { StepProcessingFunction } from './steps/step'
import { PARSE_WITH_R_SHELL_STEP } from './steps/all/core/00-parse'
import { NORMALIZE } from './steps/all/core/10-normalize'
import { STATIC_DATAFLOW } from './steps/all/core/20-dataflow'
import { STATIC_SLICE } from './steps/all/static-slicing/00-slice'
import { NAIVE_RECONSTRUCT } from './steps/all/static-slicing/10-reconstruct'

/**
 * This represents the required execution frequency of a step.
 */
export type StepRequired = 'once-per-file' | 'once-per-slice'


/**
 * Defines what is to be known of a single step in the slicing process.
 */
export interface IStep<
	Fn extends StepProcessingFunction,
> extends MergeableRecord {
	/** Human-readable description of this step */
	description: string
	/** The main processor that essentially performs the logic of this step */
	processor:   (...input: Parameters<Fn>) => ReturnType<Fn>
	/* does this step has to be repeated for each new slice or can it be performed only once in the initialization */
	required:    StepRequired
	printer: {
		[K in StepOutputFormat]?: IPipelineStepPrinter<Fn, K, never[]>
	} & {
		// we always want to have the internal printer
		[StepOutputFormat.Internal]: IPipelineStepPrinter<Fn, StepOutputFormat.Internal, []>
	}
}


export const STEPS_PER_FILE = {
	'parse': {
		description: 'Parse the given R code into an AST',
		processor:   PARSE_WITH_R_SHELL_STEP.processor,
		required:    'once-per-file',
		printer:     {
			[StepOutputFormat.Internal]: internalPrinter,
			[StepOutputFormat.Json]:     text => text,
			[StepOutputFormat.RdfQuads]: parseToQuads
		}
	} satisfies IStep<typeof PARSE_WITH_R_SHELL_STEP.processor>,
	'normalize': {
		description: 'Normalize the AST to flowR\'s AST (first step of the normalization)',
		processor:   NORMALIZE.processor,
		required:    'once-per-file',
		printer:     {
			[StepOutputFormat.Internal]:   internalPrinter,
			[StepOutputFormat.Json]:       normalizedAstToJson,
			[StepOutputFormat.RdfQuads]:   normalizedAstToQuads,
			[StepOutputFormat.Mermaid]:    printNormalizedAstToMermaid,
			[StepOutputFormat.MermaidUrl]: printNormalizedAstToMermaidUrl
		}
	} satisfies IStep<typeof NORMALIZE.processor>,
	'dataflow': {
		description: 'Construct the dataflow graph',
		processor:   STATIC_DATAFLOW.processor,
		required:    'once-per-file',
		printer:     {
			[StepOutputFormat.Internal]:   internalPrinter,
			[StepOutputFormat.Json]:       dataflowGraphToJson,
			[StepOutputFormat.RdfQuads]:   dataflowGraphToQuads,
			[StepOutputFormat.Mermaid]:    dataflowGraphToMermaid,
			[StepOutputFormat.MermaidUrl]: dataflowGraphToMermaidUrl
		}
	} satisfies IStep<typeof STATIC_DATAFLOW.processor>
} as const

export const STEPS_PER_SLICE = {
	'slice': {
		description: 'Calculate the actual static slice from the dataflow graph and the given slicing criteria',
		processor:   STATIC_SLICE.processor,
		required:    'once-per-slice',
		printer:     {
			[StepOutputFormat.Internal]: internalPrinter
		}
	} satisfies IStep<typeof STATIC_SLICE.processor>,
	'reconstruct': {
		description: 'Reconstruct R code from the static slice',
		processor:   NAIVE_RECONSTRUCT.processor,
		required:    'once-per-slice',
		printer:     {
			[StepOutputFormat.Internal]: internalPrinter
		}
	} satisfies IStep<typeof NAIVE_RECONSTRUCT.processor>
} as const

export const STEPS = { ...STEPS_PER_FILE, ...STEPS_PER_SLICE } as const
export const LAST_PER_FILE_STEP = 'dataflow' as const
export const LAST_STEP = 'reconstruct' as const

export type StepName = keyof typeof STEPS
export type Step<Name extends StepName> = typeof STEPS[Name]
export type StepProcessor<Name extends StepName> = Step<Name>['processor']
export type StepResult<Name extends StepName> = Awaited<ReturnType<StepProcessor<Name>>>

export function executeSingleSubStep<Name extends StepName, Processor extends StepProcessor<Name>>(subStep: Name, ...input: Parameters<Processor>): ReturnType<Processor> {
	// @ts-expect-error - this is safe, as we know that the function arguments are correct by 'satisfies', this saves an explicit cast with 'as'
	return STEPS[subStep].processor(...input as unknown as never[]) as ReturnType<Processor>
}

type Tail<T extends unknown[]> = T extends [infer _, ...infer Rest] ? Rest : never;

/**
 * For a `step` of the given name, which returned the given `data`. Convert that data into the given `format`.
 * Depending on your step and the format this may require `additional` inputs.
 */
export function printStepResult<
	Name extends StepName,
	Processor extends StepProcessor<Name>,
	Format extends Exclude<keyof(typeof STEPS)[Name]['printer'], StepOutputFormat.Internal> & number,
	Printer extends (typeof STEPS)[Name]['printer'][Format],
	AdditionalInput extends Tail<Parameters<Printer>>,
>(step: Name, data: Awaited<ReturnType<Processor>>, format: Format, ...additional: AdditionalInput): Promise<string> {
	const base = STEPS[step].printer
	const printer = base[format as keyof typeof base] as IPipelineStepPrinter<StepProcessor<Name>, Format, AdditionalInput> | undefined
	guard(printer !== undefined, `printer for ${step} does not support ${String(format)}`)
	return printer(data, ...additional) as Promise<string>
}
