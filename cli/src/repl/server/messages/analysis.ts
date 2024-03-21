import type { IdMessageBase, MessageDefinition } from './messages'
import type { LAST_PER_FILE_STEP, StepResults } from '@eagleoutice/flowr/core'
import Joi from 'joi'
import type { ControlFlowInformation } from '@eagleoutice/flowr/util/cfg/cfg'

/**
 * Send by the client to request an analysis of a given file.
 * Answered by either an {@link FlowrErrorMessage} or a {@link FileAnalysisResponseMessageJson}.
 */
export interface FileAnalysisRequestMessage extends IdMessageBase {
	type:       'request-file-analysis',
	/**
	 * This is a unique token that you assign to subsequently slice the respective files.
	 * If you pass the same token multiple times, previous results will be overwritten.
	 *
	 * If you do not pass a file token, the server will _not_ store the results!
	 */
	filetoken?: string,
	/**
	 * A human-readable file name. If you present a `filepath` or read from a file this should be straightforward.
	 * However, the name is only for debugging and bears no semantic meaning.
	 */
	filename?:  string,
	/** The contents of the file, or an R expression itself (like `1 + 1`), give either this or the `filepath`. */
	content?:   string
	/** The filepath on the local machine, accessible to flowR, or simply. Give either this or the `content` */
	filepath?:  string
	/** Can be used to additionally extract the {@link ControlFlowInformation} of the file, which is not exposed (and not fully calculated) by default. */
	cfg?:       boolean
	/** Controls the serialization of the `results` (and the {@link ControlFlowGraph} if the corresponding flag is set). If missing, we assume _json_. */
	format?:    'json' | 'n-quads'
}


export const requestAnalysisMessage: MessageDefinition<FileAnalysisRequestMessage> = {
	type:   'request-file-analysis',
	schema: Joi.object({
		type:      Joi.string().valid('request-file-analysis').required(),
		id:        Joi.string().optional(),
		filetoken: Joi.string().optional(),
		filename:  Joi.string().optional(),
		content:   Joi.string().optional(),
		filepath:  Joi.string().optional(),
		cfg:       Joi.boolean().optional(),
		format:    Joi.string().valid('json', 'n-quads').optional()
	}).xor('content', 'filepath')
}

/**
 * Answer for a successful {@link FileAnalysisRequestMessage}.
 * It contains the results of the analysis in JSON format (guided by {@link FileAnalysisRequestMessage#format}).
 *
 * The `idMap` of the normalization step (see {@link NormalizedAst}) is not serialized as it would essentially
 * repeat the complete normalized AST.
 *
 * @note The serialization of maps and sets is controlled by the {@link jsonReplacer} as part of {@link sendMessage}.
 *
 * @see FileAnalysisResponseMessageNQuads
 */
export interface FileAnalysisResponseMessageJson extends IdMessageBase {
	type:    'response-file-analysis',
	format:  'json',
	/**
	 * See the {@link SteppingSlicer} and {@link StepResults} for details on the results.
	 */
	results: StepResults<typeof LAST_PER_FILE_STEP>
	/**
	 * Only if the {@link FileAnalysisRequestMessage} contained a `cfg: true` this will contain the {@link ControlFlowInformation} of the file.
	 */
	cfg?:    ControlFlowInformation
}

/**
 * Similar to {@link FileAnalysisResponseMessageJson} but using n-quads as serialization format.
 */
export interface FileAnalysisResponseMessageNQuads extends IdMessageBase {
	type:    'response-file-analysis',
	format:  'n-quads',
	/**
	 * @see FileAnalysisResponseMessageJson#results
	 */
	results: {
		[K in keyof StepResults<typeof LAST_PER_FILE_STEP>]: string
	}
	/**
	 * @see FileAnalysisResponseMessageJson#cfg
	 */
	cfg?: string
}
