import type { LAST_STEP, StepName, StepResult } from './steps'

/** Represents the return value of the processor linked to the step with the name 'K' */
type Out<K extends StepName> = Record<K, StepResult<K>>;

/**
 * Essentially expresses an object that, if a step 'x' is of interest, contains the result of step 'x' and all steps before 'x'.
 */
export type StepResults<InterestedIn extends StepName | undefined> = InterestedIn extends never ? never
	: InterestedIn extends undefined ? StepResultsHelper<typeof LAST_STEP>
		: StepResultsHelper<Exclude<InterestedIn, undefined>>

type StepResultsHelper<InterestedIn extends StepName> = {
	'parse':       Out<'parse'>
	'normalize':   StepResultsHelper<'parse'> & Out<'normalize'>
	'dataflow':    StepResultsHelper<'normalize'> & Out<'dataflow'>
	'slice':       StepResultsHelper<'dataflow'> & Out<'slice'>
	'reconstruct': StepResultsHelper<'slice'> & Out<'reconstruct'>
}[InterestedIn]
