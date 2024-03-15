import { internalPrinter, StepOutputFormat } from '../../../print/print'
import type { DataflowInformation } from '../../../../dataflow/info'
import type { IPipelineStep } from '../../step'
import type { DeepReadonly } from 'ts-essentials'
import { PipelineStepStage } from '../../step'

// Use runAbstractInterpretation here when it's ready
function processor(results: { dataflow?: DataflowInformation }, _input: unknown): DataflowInformation {
	return results.dataflow as DataflowInformation
}

export const ABSTRACT_INTERPRETATION = {
	humanReadableName: 'Abstract Interpretation',
	description:       'Run abstract interpretation',
	processor:         processor,
	required:          'once-per-file',
	executed:          PipelineStepStage.OncePerFile,
	dependencies:      [ 'dataflow' ],
	decorates:         'dataflow',
	name:              'ai',
	requiredInput:     {},
	printer:           {
		[StepOutputFormat.Internal]: internalPrinter
	}
} as const satisfies DeepReadonly<IPipelineStep<'ai', typeof processor>>
