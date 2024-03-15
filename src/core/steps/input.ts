import type { MergeableRecord } from '../../util/objects'
import type { IdGenerator, NoInfo, RParseRequest, RShell } from '../../r-bridge'
import type { AutoSelectPredicate, SlicingCriteria } from '../../slicing'
import type { STEPS_PER_SLICE, StepName, STEPS_PER_FILE } from './steps'

/**
 * We split the types, as if you are only interested in what can be done per-file, you do not need a slicing criterion.
 * Furthermore, if you are only interested in the parse result, you do not require the token map and you can not pass hooks
 */
interface BaseSteppingSlicerInput<InterestedIn extends StepName | undefined> extends MergeableRecord {
	/**
	 * The step you are actually interested in.
	 * If you pass 'dataflow', the stepper will stop after analyzing the dataflow.
	 * The step is optional, if you do not pass a step, the stepper will execute all steps.
	 */
	stepOfInterest?: InterestedIn
	/** This is the {@link RShell} connection to be used to obtain the original parses AST of the R code */
	shell:           RShell
	/** The request which essentially indicates the input to extract the AST from */
	request:         RParseRequest
	/** This id generator is only necessary if you want to retrieve a dataflow from the parsed R AST, it determines the id generator to use and by default uses the {@link deterministicCountingIdGenerator}*/
	getId?:          IdGenerator<NoInfo>
	/** The slicing criterion is only of interest if you actually want to slice the R code */
	criterion?:      SlicingCriteria
	/** If you want to auto-select something in the reconstruction add it here, otherwise, it will use the default defined alongside {@link reconstructToCode}*/
	autoSelectIf?:   AutoSelectPredicate
}

interface NormalizeSteppingSlicerInput<InterestedIn extends 'dataflow' | 'normalize'> extends BaseSteppingSlicerInput<InterestedIn> {
	stepOfInterest: InterestedIn
}

interface SliceSteppingSlicerInput<InterestedIn extends 'reconstruct' | 'slice' | undefined> extends BaseSteppingSlicerInput<InterestedIn> {
	stepOfInterest?: InterestedIn
	criterion:       SlicingCriteria
}

/**
 * For a given set of steps of interest, this essentially (statically) determines the required inputs for the {@link SteppingSlicer}.
 * All arguments are documented alongside {@link BaseSteppingSlicerInput}.
 */
export type SteppingSlicerInput<InterestedIn extends StepName | undefined = undefined> =
		InterestedIn extends keyof typeof STEPS_PER_SLICE | undefined ? SliceSteppingSlicerInput<InterestedIn> :
			InterestedIn extends Exclude<keyof typeof STEPS_PER_FILE, 'parse'> ? NormalizeSteppingSlicerInput<InterestedIn> :
				BaseSteppingSlicerInput<InterestedIn>
