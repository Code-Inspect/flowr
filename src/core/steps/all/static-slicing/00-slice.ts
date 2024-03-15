import { internalPrinter, StepOutputFormat } from '../../../print/print'
import type { IPipelineStep } from '../../step'
import { PipelineStepStage } from '../../step'
import type { SlicingCriteria } from '../../../../slicing'
import { staticSlicing } from '../../../../slicing'
import type { DeepReadonly } from 'ts-essentials'
import type { NormalizeRequiredInput } from '../core/10-normalize'
import type { DataflowInformation } from '../../../../dataflow/info'
import type { NormalizedAst } from '../../../../r-bridge'

export interface SliceRequiredInput extends NormalizeRequiredInput {
	/** The slicing criterion is only of interest if you actually want to slice the R code */
	readonly criterion:  SlicingCriteria,
	/** How many re-visits of the same node are ok? */
	readonly threshold?: number
}

function processor(results: { dataflow?: DataflowInformation, normalize?: NormalizedAst }, input: Partial<SliceRequiredInput>) {
	return staticSlicing((results.dataflow as DataflowInformation).graph, results.normalize as NormalizedAst, input.criterion as SlicingCriteria, input.threshold)
}

export const STATIC_SLICE = {
	name:              'slice',
	humanReadableName: 'static slice',
	description:       'Calculate the actual static slice from the dataflow graph and the given slicing criteria',
	processor,
	executed:          PipelineStepStage.OncePerRequest,
	printer:           {
		[StepOutputFormat.Internal]: internalPrinter
	},
	dependencies:  [ 'dataflow' ],
	requiredInput: undefined as unknown as SliceRequiredInput
} as const satisfies DeepReadonly<IPipelineStep<'slice', typeof processor>>
