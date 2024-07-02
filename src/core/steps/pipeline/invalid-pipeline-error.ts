/**
 * Thrown if for whatever reason, the pipeline is invalid.
 */
export class InvalidPipelineError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'InvalidPipelineError'
	}
}
