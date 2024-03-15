import { guard } from '../util/assert'
import type {
	Pipeline,
	PipelineInput,
	PipelineOutput,
	PipelinePerRequestInput,
	PipelineStepNames,
	PipelineStepOutputWithName
} from './steps/pipeline'
import type { PipelineStepName } from './steps/step'
import { PipelineStepStage } from './steps/step'

/**
 * The pipeline executor allows to execute arbitrary {@link Pipeline|pipelines} in a step-by-step fashion.
 * If you are not yet in the possession of a {@link Pipeline|pipeline}, you can use the {@link createPipeline} function
 * to create one for yourself, based on the steps that you want to execute.
 *
 * Those steps are split into two phases or "stages" (which is the name that we will use in the following), represented
 * by the {@link PipelineStepStage} type. These allow us to separate things that have to be done
 * once per-file, e.g., actually parsing the AST, from those, that we need to repeat 'once per request' (whatever this
 * request may be). In other words, what can be cached between operations and what can not.
 *
 * Furthermore, this executor follows an iterable fashion to be *as flexible as possible*
 * (e.g., to be instrumented with measurements). So, you can use the pipeline executor like this:
 *
 * ```ts
 * const stepper = new PipelineExecutor( ... )
 * while(stepper.hasNextStep()) {
 *     await stepper.nextStep()
 * }
 *
 * stepper.switchToRequestStage()
 *
 * while(stepper.hasNextStep()) {
 *     await stepper.nextStep()
 * }
 *
 * const result = stepper.getResults()
 * ```
 *
 * Of course, you might think, that this is rather overkill if you simply want to receive the result.
 * And this is true. Therefore, if you do not want to perform some kind of magic in-between steps, you can use the
 * **{@link allRemainingSteps}** function like this:
 *
 * ```ts
 * const stepper = new PipelineExecutor( ... )
 * const result = await stepper.allRemainingSteps()
 * ```
 *
 * As the name suggest, you can combine this name with previous calls to {@link nextStep} to only execute the remaining
 * steps in case, for whatever reason you only want to instrument some steps.
 *
 * By default, the {@link PipelineExecutor} does not offer an automatic way to repeat requests (mostly to prevent accidental errors).
 * However, you can use the
 * **{@link updateRequest}** function to reset the request steps and re-execute them for a new request. This allows something like the following:
 *
 * ```ts
 * const stepper = new PipelineExecutor( ... )
 * const result = await stepper.allRemainingSteps()
 *
 * stepper.updateRequest( ... )
 * const result2 = await stepper.allRemainingSteps()
 * ```
 *
 * **Example - Slicing With the Pipeline Executor**:
 *
 * Suppose, you want to... you know _slice_ a file (which was, at one point the origin of flowR), then you can
 * either create a pipeline yourself with the respective steps, or you can use the {@link DEFAULT_SLICING_PIPELINE} (and friends).
 * With it, slicing essentially becomes 'easy-as-pie':
 *
 * ```ts
 * const slicer = new PipelineExecutor(DEFAULT_SLICING_PIPELINE, {
 *    shell:     new RShell(),
 *    // of course, the criterion and request given here are just examples, you can use whatever you want to slice!
 *    criterion: ['2@b'],
 *    request:   requestFromInput('b <- 3; x <- 5\ncat(b)'),
 * })
 * const result = await slicer.allRemainingSteps()
 * ```
 *
 * But now, we want to slice for `x` in the first line as well! We can do that by adding:
 *
 * ```ts
 * stepper.updateRequest({ criterion: ['1@x'] })
 * const result2 = await stepper.allRemainingSteps()
 * ```
 *
 * @note Even though using the pipeline executor introduces a small performance overhead, we consider
 * it to be the baseline for performance benchmarking. It may very well be possible to squeeze out a little bit more by
 * directly constructing the steps in the right order. However, we consider this to be negligible when compared with the time required
 * for, for example, the dataflow analysis of larger files.
 *
 * @see PipelineExecutor#allRemainingSteps
 * @see PipelineExecutor#nextStep
 */
export class PipelineExecutor<P extends Pipeline> {
	private readonly pipeline: P
	private readonly length:   number

	private input:  PipelineInput<P>
	private output: PipelineOutput<P> = {} as PipelineOutput<P>
	private currentExecutionStage = PipelineStepStage.OncePerFile
	private stepCounter = 0

	/**
	 * Construct a new pipeline executor.
	 * The required additional input is specified by the {@link IPipelineStep#requiredInput|required input configuration} of each step in the `pipeline`.
	 *
	 * @param pipeline - The {@link Pipeline} to execute, probably created with {@link createPipeline}.
	 * @param input    - External {@link PipelineInput|configuration and input} required to execute the given pipeline.
	 */
	constructor(pipeline: P, input: PipelineInput<P>) {
		this.pipeline = pipeline
		this.length = pipeline.order.length
		this.input = input
	}

	/**
	 * Retrieve the current {@link PipelineStepStage|stage} the pipeline executor is in.
	 *
	 * @see currentExecutionStage
	 * @see switchToRequestStage
	 * @see PipelineStepStage
	 */
	public getCurrentStage(): PipelineStepStage {
		return this.currentExecutionStage
	}

	/**
	 * Switch to the next {@link PipelineStepStage|stage} of the pipeline executor.
	 *
	 * This will fail if either a step change is currently not valid (as not all steps have been executed),
	 * or if there is no next stage (i.e., the pipeline is already completed or in the last stage).
	 *
	 * @see PipelineExecutor
	 * @see getCurrentStage
	 */
	public switchToRequestStage(): void {
		guard(this.stepCounter === this.pipeline.firstStepPerRequest, 'First need to complete all steps before switching')
		guard(this.currentExecutionStage === PipelineStepStage.OncePerFile, 'Cannot switch to next stage, already in per-request stage.')
		this.currentExecutionStage = PipelineStepStage.OncePerRequest
	}


	public getResults(intermediate?:false): PipelineOutput<P>
	public getResults(intermediate: true): Partial<PipelineOutput<P>>
	public getResults(intermediate: boolean): PipelineOutput<P> | Partial<PipelineOutput<P>>
	/**
	 * Returns the results of the pipeline.
	 *
	 * @param intermediate - Normally you can only receive the results *after* the stepper completed the step of interested.
	 * 		 However, if you pass `true` to this parameter, you can also receive the results *before* the {@link PipelineExecutor|pipeline executor}
	 * 		 completed, although the typing system then can not guarantee which of the steps have already happened.
	 */
	public getResults(intermediate = false): PipelineOutput<P> | Partial<PipelineOutput<P>> {
		guard(intermediate || this.stepCounter >= this.length, 'Without the intermediate flag, the pipeline must be completed before providing access to the results.')
		return this.output
	}

	/**
	 * Returns true only if
	 * 1) there are more {@link IPipelineStep|steps} to-do for the current {@link PipelineStepStage|stage} and
	 * 2) we have not yet reached the end of the {@link Pipeline|pipeline}.
	 */
	public hasNextStep(): boolean {
		return (this.stepCounter < this.length && this.currentExecutionStage !== PipelineStepStage.OncePerFile)
			|| this.stepCounter < this.pipeline.firstStepPerRequest
	}

	/**
	 * Execute the next {@link IPipelineStep|step} and return the name of the {@link IPipelineStep|step} that was executed,
	 * so you can guard if the {@link IPipelineStep|step} differs from what you are interested in.
	 * Furthermore, it returns the {@link IPipelineStep|step's} result.
	 *
	 * @param expectedStepName - A safeguard if you want to retrieve the result.
	 * 												   If given, it causes the execution to fail if the next step is not the one you expect.
	 *
	 * _Without `expectedStepName`, please refrain from accessing the result, as you have no safeguards if the pipeline changes._
	 */
	public async nextStep<PassedName extends PipelineStepName>(expectedStepName?: PassedName): Promise<{
		name:   typeof expectedStepName extends undefined ? PipelineStepName : PassedName
		result: typeof expectedStepName extends undefined ? unknown : PipelineStepOutputWithName<P, PassedName>
	}> {
		const [step, result] = this._doNextStep(expectedStepName)
		const awaitedResult = await result

		this.output[step as PipelineStepNames<P>] = awaitedResult
		this.stepCounter++

		return { name: step as PassedName, result: awaitedResult }
	}

	private _doNextStep(expectedStepName: Readonly<PipelineStepName | undefined>): [
		step:   PipelineStepName,
		result: Promise<PipelineStepOutputWithName<P, PipelineStepName>>
	] {
		const step = this.pipeline.steps.get(this.pipeline.order[this.stepCounter])
		guard(step !== undefined, () => `Cannot execute next step, step ${this.pipeline.order[this.stepCounter]} does not exist.`)

		if(expectedStepName !== undefined) {
			guard(step.name === expectedStepName, () => `Cannot execute next step, expected step ${JSON.stringify(expectedStepName)} but got ${step.name}.`)
		}

		return [step.name, step.processor(this.output, this.input) as unknown as PipelineStepOutputWithName<P, PipelineStepName>]
	}

	/**
	 * This only makes sense if you have already run a request and want to re-use the per-file results for a new one.
	 * (or if for whatever reason you did not pass information for the pipeline with the constructor).
	 *
	 * @param newRequestData - Data for the new request
	 */
	public updateRequest(newRequestData: PipelinePerRequestInput<P>): void {
		const requestStep = this.pipeline.firstStepPerRequest
		guard(this.stepCounter >= requestStep, 'Cannot reset request prior to once-per-request stage')
		this.input = {
			...(this.input as object),
			...newRequestData
		} as PipelineInput<P>
		this.stepCounter = requestStep
		// clear the results for all steps with an index >= firstStepPerRequest, this is more of a sanity check
		for(let i = requestStep; i < this.length; i++) {
			this.output[this.pipeline.order[i] as PipelineStepNames<P>] = undefined as unknown as PipelineStepOutputWithName<P, PipelineStepName>
		}
	}

	public async allRemainingSteps(canSwitchStage: false): Promise<Partial<PipelineOutput<P>>>
	public async allRemainingSteps(canSwitchStage?: true): Promise<PipelineOutput<P>>
	public async allRemainingSteps(canSwitchStage: boolean): Promise<PipelineOutput<P> | Partial<PipelineOutput<P>>>
	/**
	 * Execute all remaining steps and automatically call {@link switchToRequestStage} if necessary.
	 * @param canSwitchStage - If true, automatically switch to the request stage if necessary
	 *       (i.e., this is what you want if you have never executed {@link nextStep} and you want to execute *all* steps).
	 *       However, passing false allows you to only execute the steps of the 'once-per-file' stage (i.e., the steps that can be cached).
	 *
	 * @note There is a small type difference if you pass 'false' and already have manually switched to the 'once-per-request' stage.
	 *       Because now, the results of these steps are no longer part of the result type (although they are still included).
	 *       In such a case, you may be better off with simply passing 'true' as the function will detect that the stage is already switched.
	 *       We could solve this type problem by separating the {@link PipelineExecutor} class into two for each stage,
	 *       but this would break the improved readability and unified handling of the executor that I wanted to achieve with this class.
	 */
	public async allRemainingSteps(canSwitchStage = true): Promise<PipelineOutput<P> | Partial<PipelineOutput<P>>> {
		while(this.hasNextStep()) {
			await this.nextStep()
		}

		if(canSwitchStage && this.stepCounter < this.length && this.currentExecutionStage === PipelineStepStage.OncePerFile) {
			this.switchToRequestStage()
			while(this.hasNextStep()) {
				await this.nextStep()
			}
		}

		return this.stepCounter < this.length ? this.getResults(true) : this.getResults()
	}
}
