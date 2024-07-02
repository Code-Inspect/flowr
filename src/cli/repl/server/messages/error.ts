import type { IdMessageBase } from './messages'

/**
 * Sent in case of any error (e.g., if the analysis fails, or the message contains syntax errors).
 */
export interface FlowrErrorMessage extends IdMessageBase {
	type:   'error',
	/** if fatal, the connection will be partially closed afterward */
	fatal:  boolean,
	/** the human-readable reason for the error */
	reason: string
}
