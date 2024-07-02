/** use this to ensure that all cases are covered in case of a selection */

/* istanbul ignore next */
export function assertUnreachable(x: never): never {
	throw new Error(`Unexpected object: ${JSON.stringify(x)}`)
}

export function isNotUndefined<T>(x: T | undefined): x is T {
	return x !== undefined
}

export function isUndefined<T>(x: T | undefined): x is undefined {
	return x === undefined
}

export function isNotNull<T>(x: T | null): x is T {
	return x !== null
}

class GuardError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'GuardError'
	}
}

export type GuardMessage = string | (() => string)

/**
 * @param assertion - will be asserted
 * @param message - if a string, will be used as error message, if a function, will be called to produce the error message (can be used to avoid costly message generations)
 * @throws GuardError - if the assertion fails
 */
export function guard(assertion: boolean | undefined, message: GuardMessage = 'Assertion failed'): asserts assertion {
	if(!assertion) {
		throw new GuardError( typeof message === 'string' ? message : message())
	}
}
