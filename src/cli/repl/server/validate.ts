import Joi from 'joi'
import { sendMessage } from './send'
import { baseMessage, ExtractorMessage, IdMessageBase, MessageDefinition } from './messages/messages'
import { ExtractorErrorMessage } from './messages/error'
import { Socket } from './net'

export interface ValidationErrorResult { type: 'error', reason: Joi.ValidationError | Error }
export interface SuccessValidationResult<T extends IdMessageBase> { type: 'success', message: T }
export type ValidationResult<T extends IdMessageBase> = SuccessValidationResult<T> | ValidationErrorResult

export function validateBaseMessageFormat(input: string): ValidationResult<IdMessageBase> {
	try {
		return validateMessage(JSON.parse(input) as IdMessageBase, baseMessage)
	} catch(e) {
		return { type: 'error', reason: e as Error }
	}
}

export function validateMessage<T extends ExtractorMessage | IdMessageBase>(input: IdMessageBase, def: MessageDefinition<T>): ValidationResult<T>  {
	try {
		const result = def.schema.validate(input)
		return result.error ? { type: 'error', reason: result.error } : { type: 'success', message: input as T }
	} catch(e) {
		return { type: 'error', reason: e as Error }
	}
}

export function answerForValidationError(client: Socket, result: ValidationErrorResult, id?: string): void {
	sendMessage<ExtractorErrorMessage>(client, {
		type:   'error',
		fatal:  false,
		id:     id,
		reason: `Invalid message format: ${result.reason.message}`
	})
}
