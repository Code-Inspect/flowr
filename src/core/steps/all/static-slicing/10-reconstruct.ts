import { internalPrinter, StepOutputFormat } from '../../../print/print'
import type { IPipelineStep } from '../../pipeline-step'
import { PipelineStepStage } from '../../pipeline-step'
import type { DeepReadonly } from 'ts-essentials'
import type { SliceResult } from '../../../../slicing/static/slicer-types'
import type { AutoSelectPredicate } from '../../../../reconstruct/reconstruct'
import { reconstructToCode } from '../../../../reconstruct/reconstruct'
import type { NormalizedAst } from '../../../../r-bridge/lang-4.x/ast/model/processing/decorate'

export interface ReconstructRequiredInput {
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
