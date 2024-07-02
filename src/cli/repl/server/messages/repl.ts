import type { IdMessageBase, MessageDefinition } from './messages'
import * as Joi from 'joi'

/**
 * Request the execution of the given expression as a REPL statement.
 * We strongly recommend that you make use of a unique {@link IdMessageBase#id}
 * in case the message responses happen in parallel.
 *
 * @see ExecuteIntermediateResponseMessage
 * @see ExecuteEndMessage
 */
export interface ExecuteRequestMessage extends IdMessageBase {
	type:       'request-repl-execution',
	/** Should ansi formatting be enabled for the response? Is `false` by default.  */
	ansi?:      boolean,
	/** The expression to execute */
	expression: string
}

export const requestExecuteReplExpressionMessage: MessageDefinition<ExecuteRequestMessage> = {
	type:   'request-repl-execution',
	schema: Joi.object({
		type:       Joi.string().valid('request-repl-execution').required(),
		id:         Joi.string().optional(),
		ansi:       Joi.boolean().optional(),
		expression: Joi.string().required(),
	})
}

/**
 * This message may be sent multiple times, triggered for every "output" performed by the execution.
 * {@link ExecuteEndMessage} marks the end of these messages.
 */
export interface ExecuteIntermediateResponseMessage extends IdMessageBase {
	type:   'response-repl-execution'
	stream: 'stdout' | 'stderr'
	result: string
}

/**
 * Marks the end of the execution of the respective {@link ExecuteRequestMessage}.
 * The underlying TCP connection should ensure the ordering so that this message is the last.
 */
export interface ExecuteEndMessage extends IdMessageBase {
	type: 'end-repl-execution'
}

