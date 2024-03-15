import type { SlicingCriteria } from '../slicing'
import type { Pipeline, PipelineOutput, PipelineStepOutputWithName } from './steps/pipeline'
import { createPipeline } from './steps/pipeline'
import { PARSE_WITH_R_SHELL_STEP } from './steps/all/core/00-parse'
import { NORMALIZE } from './steps/all/core/10-normalize'
import { STATIC_DATAFLOW } from './steps/all/core/20-dataflow'
import { STATIC_SLICE } from './steps/all/static-slicing/00-slice'
import { NAIVE_RECONSTRUCT } from './steps/all/static-slicing/10-reconstruct'
import { PipelineExecutor } from './pipeline-executor'
import type { LAST_PER_FILE_STEP, StepName } from './steps/steps'
import { LAST_STEP } from './steps/steps'
import type { SteppingSlicerInput } from './steps/input'
import type { PipelineStepName, PipelineStepStage } from './steps/step'

const legacyPipelines = {
	// brrh, but who cares, it is legacy!
	'parse':       createPipeline(PARSE_WITH_R_SHELL_STEP),
	'normalize':   createPipeline(PARSE_WITH_R_SHELL_STEP, NORMALIZE),
	'dataflow':    createPipeline(PARSE_WITH_R_SHELL_STEP, NORMALIZE, STATIC_DATAFLOW),
	'ai':          createPipeline(PARSE_WITH_R_SHELL_STEP, NORMALIZE, STATIC_DATAFLOW),
	'slice':       createPipeline(PARSE_WITH_R_SHELL_STEP, NORMALIZE, STATIC_DATAFLOW, STATIC_SLICE),
	'reconstruct': createPipeline(PARSE_WITH_R_SHELL_STEP, NORMALIZE, STATIC_DATAFLOW, STATIC_SLICE, NAIVE_RECONSTRUCT)
} as const

type LegacyPipelineType<InterestedIn extends StepName> = typeof legacyPipelines[InterestedIn]

function getLegacyPipeline(interestedIn: StepName): Pipeline {
	return legacyPipelines[interestedIn]
}

/**
 * This is ultimately the root of flowR's static slicing procedure.
 * It clearly defines the steps that are to be executed and splits them into two stages.
 * - `once-per-file`: for steps that are executed once per file. These can be performed *without* the knowledge of a slicing criteria,
 *   and they can be cached and re-used if you want to slice the same file multiple times.
 * - `once-per-slice`: for steps that are executed once per slice. These can only be performed *with* a slicing criteria.
 *
 * Furthermore, this stepper follows an iterable fashion to be *as flexible as possible* (e.g., to be instrumented with measurements).
 * So, you can use the stepping slicer like this:
 *
 * ```ts
 * const slicer = new SteppingSlicer({ ... })
 * while(slicer.hasNextStep()) {
 *     await slicer.nextStep()
 * }
 *
 * slicer.switchToSliceStage()
 *
 * while(slicer.hasNextStep()) {
 *     await slicer.nextStep()
 * }
 *
 * const result = slicer.getResults()
 * ```
 *
 * Of course, you might think, that this is rather overkill if you simply want to receive the slice of a given input source or in general
 * the result of any step. And this is true. Therefore, if you do not want to perform some kind of magic in-between steps, you can use the
 * **{@link allRemainingSteps}** function like this:
 *
 * ```ts
 * const slicer = new SteppingSlicer({ ... })
 * const result = await slicer.allRemainingSteps()
 * ```
 *
 * As the name suggest, you can combine this name with previous calls to {@link nextStep} to only execute the remaining steps.
 *
 * Giving the **step of interest** allows you to declare the maximum step to execute.
 * So, if you pass `dataflow` as the step of interest, the stepping slicer will stop after the dataflow step.
 * If you do not pass a step, the stepping slicer will execute all steps.
 *
 * By default, the {@link SteppingSlicer} does not offer an automatic way to repeat the per-slice steps for multiple slices (this is mostly to prevent accidental errors).
 * However, you can use the **{@link updateCriterion}** function to reset the per-slice steps and re-execute them for a new slice. This allows something like the following:
 *
 * ```ts
 * const slicer = new SteppingSlicer({ ... })
 * const result = await slicer.allRemainingSteps()
 *
 * slicer.updateCriterion(...)
 * const result2 = await slicer.allRemainingSteps()
 * ```
 *
 * @note Even though, using the stepping slicer introduces some performance overhead, we consider
 * it to be the baseline for performance benchmarking. It may very well be possible to squeeze out some more performance by
 * directly constructing the steps in the right order. However, we consider this to be negligible when compared with the time required
 * for, for example, the dataflow analysis.
 *
 * @see retrieveResultOfStep
 * @see StepName
 */
export class SteppingSlicer<InterestedIn extends StepName = typeof LAST_STEP> {
	private executor: PipelineExecutor<LegacyPipelineType<InterestedIn>>

	/**
	 * Create a new stepping slicer. For more details on the arguments please see {@link SteppingSlicerInput}.
	 */
	constructor(input: SteppingSlicerInput<InterestedIn>) {
		this.executor = new PipelineExecutor(getLegacyPipeline(input.stepOfInterest ?? LAST_STEP), input) as PipelineExecutor<LegacyPipelineType<InterestedIn>>
	}

	/**
	 * Retrieve the current stage the stepping slicer is in.
	 * @see PipelineStepStage
	 * @see switchToSliceStage
	 */
	public getCurrentStage(): PipelineStepStage {
		return this.executor.getCurrentStage()
	}

	/**
	 * Switch to the next stage of the stepping slicer.
	 * @see SteppingSlicer
	 * @see getCurrentStage
	 */
	public switchToSliceStage(): void {
		this.executor.switchToRequestStage()
	}


	public getResults(intermediate?:false): PipelineOutput<LegacyPipelineType<InterestedIn>>
	public getResults(intermediate: true): Partial<PipelineOutput<LegacyPipelineType<InterestedIn>>>
	/**
	 * Returns the result of the step of interest, as well as the results of all steps before it.
	 *
	 * @param intermediate - normally you can only receive the results *after* the stepper completed the step of interested.
	 * 		 However, if you pass `true` to this parameter, you can also receive the results *before* the step of interest,
	 * 		 although the typing system then can not guarantee which of the steps have already happened.
	 */
	public getResults(intermediate = false): PipelineOutput<LegacyPipelineType<InterestedIn>> | Partial<PipelineOutput<LegacyPipelineType<InterestedIn>>> {
		return this.executor.getResults(intermediate)
	}

	/**
	 * Returns true only if 1) there are more steps to-do for the current stage and 2) we have not yet reached the step we are interested in
	 */
	public hasNextStep(): boolean {
		return this.executor.hasNextStep()
	}

	/**
	 * Execute the next step (guarded with {@link hasNextStep}) and return the name of the step that was executed, so you can guard if the step differs from what you are interested in.
	 * Furthermore, it returns the step's result.
	 *
	 * The `step` parameter is a safeguard if you want to retrieve the result.
	 * If given, it causes the execution to fail if the next step is not the one you expect.
	 * *Without step, please refrain from accessing the result.*
	 */
	public async nextStep<PassedName extends PipelineStepName>(expectedStepName?: PassedName): Promise<{
		name:   typeof expectedStepName extends undefined ? PipelineStepName : PassedName
		result: typeof expectedStepName extends undefined ? unknown : PipelineStepOutputWithName<LegacyPipelineType<InterestedIn>, Exclude<PassedName, undefined>>
	}> {
		return this.executor.nextStep(expectedStepName)
	}

	/**
	 * This only makes sense if you have already sliced a file (e.g., by running up to the `slice` step) and want to do so again while caching the results.
	 * Or if for whatever reason you did not pass a criterion with the constructor.
	 *
	 * @param newCriterion - the new slicing criterion to use for the next slice
	 */
	public updateCriterion(newCriterion: SlicingCriteria): void {
		// @ts-expect-error -- it is legacy
		this.executor.updateRequest({ criterion: newCriterion })
	}

	public async allRemainingSteps(canSwitchStage: false): Promise<Partial<PipelineOutput<LegacyPipelineType<InterestedIn | typeof LAST_PER_FILE_STEP>>>>
	public async allRemainingSteps(canSwitchStage?: true): Promise<PipelineOutput<LegacyPipelineType<InterestedIn | typeof LAST_PER_FILE_STEP>>>
	/**
	 * Execute all remaining steps and automatically call {@link switchToSliceStage} if necessary.
	 * @param canSwitchStage - if true, automatically switch to the slice stage if necessary
	 *       (i.e., this is what you want if you have never executed {@link nextStep} and you want to execute *all* steps).
	 *       However, passing false allows you to only execute the steps of the 'once-per-file' stage (i.e., the steps that can be cached).
	 *
	 * @note There is a small type difference if you pass 'false' and already have manually switched to the 'once-per-slice' stage.
	 *       Because now, the results of these steps are no longer part of the result type (although they are still included).
	 *       In such a case, you may be better off with simply passing 'true' as the function will detect that the stage is already switched.
	 *       We could solve this type problem by separating the SteppingSlicer class into two for each stage, but this would break the improved readability and unified handling
	 *       of the slicer that I wanted to achieve with this class.
	 */
	public async allRemainingSteps(canSwitchStage = true): Promise<PipelineOutput<LegacyPipelineType<InterestedIn | typeof LAST_PER_FILE_STEP>> | Partial<PipelineOutput<LegacyPipelineType<InterestedIn | typeof LAST_PER_FILE_STEP>>>> {
		return this.executor.allRemainingSteps(canSwitchStage)
	}
}
