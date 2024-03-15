import { internalPrinter, StepOutputFormat } from '../../../print/print'
import type { IPipelineStep } from '../../step'
import { PipelineStepStage } from '../../step'
import type { AutoSelectPredicate, SliceResult } from '../../../../slicing'
import { reconstructToCode } from '../../../../slicing'
import type { DeepReadonly } from 'ts-essentials'
import type { NormalizedAst } from '../../../../r-bridge'
import type { SliceRequiredInput } from './00-slice'

export interface ReconstructRequiredInput extends SliceRequiredInput {
	autoSelectIf?: AutoSelectPredicate
}

function processor(results: { normalize?: NormalizedAst, slice?: SliceResult }, input: Partial<ReconstructRequiredInput>) {
	return reconstructToCode(results.normalize as NormalizedAst, (results.slice as SliceResult).result, input.autoSelectIf)
}

export const NAIVE_RECONSTRUCT = {
	name:              'reconstruct',
	humanReadableName: 'static code reconstruction',
	description:       'Reconstruct R code from the static slice',
	processor,
	executed:          PipelineStepStage.OncePerRequest,
	printer:           {
		[StepOutputFormat.Internal]: internalPrinter
	},
	dependencies:  [ 'slice' ],
	requiredInput: undefined as unknown as ReconstructRequiredInput
} as const satisfies DeepReadonly<IPipelineStep<'reconstruct', typeof processor>>
