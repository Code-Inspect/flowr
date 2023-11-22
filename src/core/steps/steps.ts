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

import {
	normalize,
	retrieveXmlFromRCode
} from '../../r-bridge'
import { produceDataFlowGraph } from '../../dataflow'
import { reconstructToCode, staticSlicing } from '../../slicing'
import { internalPrinter, IStepPrinter, StepOutputFormat } from '../print/print'
import {
	normalizedAstToJson,
	normalizedAstToQuads,
	printNormalizedAstToMermaid,
	printNormalizedAstToMermaidUrl
} from '../print/normalize-printer'
import { guard } from '../../util/assert'
import {
	dataflowGraphToJson,
	dataflowGraphToMermaid,
	dataflowGraphToMermaidUrl,
	dataflowGraphToQuads
} from '../print/dataflow-printer'
import { parseToQuads } from '../print/parse-printer'
import { IStep } from './step'


export const STEPS_PER_FILE = {
	'parse': {
		name:        'parse',
		description: 'Parse the given R code into an AST',
		processor:   retrieveXmlFromRCode,
		required:    'once-per-file',
		printer:     {
			[StepOutputFormat.Internal]: internalPrinter,
			[StepOutputFormat.Json]:     text => text,
			[StepOutputFormat.RdfQuads]: parseToQuads
		},
		dependencies: []
	} satisfies IStep<typeof retrieveXmlFromRCode>,
	'normalize': {
		name:        'normalize',
		description: 'Normalize the AST to flowR\'s AST (first step of the normalization)',
		processor:   normalize,
		required:    'once-per-file',
		printer:     {
			[StepOutputFormat.Internal]:   internalPrinter,
			[StepOutputFormat.Json]:       normalizedAstToJson,
			[StepOutputFormat.RdfQuads]:   normalizedAstToQuads,
			[StepOutputFormat.Mermaid]:    printNormalizedAstToMermaid,
			[StepOutputFormat.MermaidUrl]: printNormalizedAstToMermaidUrl
		},
		dependencies: []
	} satisfies IStep<typeof normalize>,
	'dataflow': {
		name:        'dataflow',
		description: 'Construct the dataflow graph',
		processor:   produceDataFlowGraph,
		required:    'once-per-file',
		printer:     {
			[StepOutputFormat.Internal]:   internalPrinter,
			[StepOutputFormat.Json]:       dataflowGraphToJson,
			[StepOutputFormat.RdfQuads]:   dataflowGraphToQuads,
			[StepOutputFormat.Mermaid]:    dataflowGraphToMermaid,
			[StepOutputFormat.MermaidUrl]: dataflowGraphToMermaidUrl
		},
		dependencies: []
	} satisfies IStep<typeof produceDataFlowGraph>
} as const

export const STEPS_PER_SLICE = {
	'slice': {
		name:        'slice',
		description: 'Calculate the actual static slice from the dataflow graph and the given slicing criteria',
		processor:   staticSlicing,
		required:    'once-per-slice',
		printer:     {
			[StepOutputFormat.Internal]: internalPrinter
		},
		dependencies: [ ]
	} satisfies IStep<typeof staticSlicing>,
	'reconstruct': {
		name:        'reconstruct',
		description: 'Reconstruct R code from the static slice',
		processor:   reconstructToCode,
		required:    'once-per-slice',
		printer:     {
			[StepOutputFormat.Internal]: internalPrinter
		},
		dependencies: [ ]
	} satisfies IStep<typeof reconstructToCode>
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
	const printer = base[format as keyof typeof base] as IStepPrinter<StepProcessor<Name>, Format, AdditionalInput> | undefined
	guard(printer !== undefined, `printer for ${step} does not support ${String(format)}`)
	return printer(data, ...additional) as Promise<string>
}
