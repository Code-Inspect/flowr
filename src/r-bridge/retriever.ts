import { type RShell } from './shell'
import { startAndEndsWith } from '../util/strings'
import type { AsyncOrSync } from 'ts-essentials'
import { guard } from '../util/assert'
import { RShellExecutor } from './shell-executor'
import objectHash from 'object-hash'
import { normalize } from './lang-4.x/ast/parser/json/parser'
import { ErrorMarker } from './init'
import { ts2r } from './lang-4.x/convert-values'
import type { NormalizedAst } from './lang-4.x/ast/model/processing/decorate'
import { RawRType } from './lang-4.x/ast/model/type'

export const fileProtocol = 'file://'

export interface RParseRequestFromFile {
	readonly request: 'file';
	/**
	 * The path to the file (an absolute path is probably best here).
	 * See {@link RParseRequests} for multiple files.
	 */
	readonly content: string;
}

export interface RParseRequestFromText {
	readonly request: 'text'
	/**
	 * Source code to parse (not a file path).
	 * If you want to parse multiple files as one, either use {@link RParseRequests},
	 * a higher request as a {@link FileAnalysisRequestMessage},
	 * or concatenate their contents to pass them with this request.
	 */
	readonly content: string
}

/**
 * A provider for an {@link RParseRequests} that can be used, for example, to override source file parsing behavior in tests
 */
export interface RParseRequestProvider {
	createRequest(path: string): RParseRequest
}

export type RParseRequest = RParseRequestFromFile | RParseRequestFromText
/**
 * Several requests that can be passed along to {@link retrieveParseDataFromRCode}.
 */
export type RParseRequests = RParseRequest | ReadonlyArray<RParseRequest>

export function requestFromInput(input: `${typeof fileProtocol}${string}`): RParseRequestFromFile
export function requestFromInput(input: `${typeof fileProtocol}${string}`[]): RParseRequestFromFile[]
export function requestFromInput(input: string): RParseRequestFromText
export function requestFromInput(input: readonly string[]): RParseRequests

/**
 * Creates a {@link RParseRequests} from a given input.
 * If your input starts with {@link fileProtocol}, it is assumed to be a file path and will be processed as such.
 * Giving an array, you can mix file paths and text content (again using the {@link fileProtocol}).
 *
 */
export function requestFromInput(input: `${typeof fileProtocol}${string}` | string | readonly string[]): RParseRequests  {
	if(Array.isArray(input)) {
		return input.flatMap(requestFromInput)
	}
	const content = input as string
	const file = content.startsWith(fileProtocol)
	return {
		request: file ? 'file' : 'text',
		content: file ? content.slice(7) : content
	}
}


export function requestProviderFromFile(): RParseRequestProvider {
	return {
		createRequest(path: string): RParseRequest {
			return {
				request: 'file',
				content: path,
			}
		}
	}
}

export function requestProviderFromText(text: Readonly<{[path: string]: string}>): RParseRequestProvider {
	return {
		createRequest(path: string): RParseRequest {
			return {
				request: 'text',
				content: text[path]
			}
		}
	}
}

export function requestFingerprint(request: RParseRequest): string {
	return objectHash(request)
}

export function isEmptyRequest(request: RParseRequest): boolean {
	return request.content.trim().length === 0
}


export function retrieveParseDataFromRCode(request: RParseRequest, shell: RShell): Promise<string>
export function retrieveParseDataFromRCode(request: RParseRequest, shell: RShellExecutor): string
export function retrieveParseDataFromRCode(request: RParseRequest, shell: RShell | RShellExecutor): AsyncOrSync<string>
/**
 * Provides the capability to parse R files/R code using the R parser.
 * Depends on {@link RShell} to provide a connection to R.
 * <p>
 * Throws if the file could not be parsed.
 * If successful, allows further querying the last result with {@link retrieveNumberOfRTokensOfLastParse}.
 */
export function retrieveParseDataFromRCode(request: RParseRequest, shell: RShell | RShellExecutor): AsyncOrSync<string> {
	if(isEmptyRequest(request)) {
		return Promise.resolve('')
	}
	const suffix = request.request === 'file' ? ', encoding="utf-8"' : ''
	/* call the function with the request */
	const command =`flowr_get_ast(${request.request}=${JSON.stringify(
		request.content
	)}${suffix})`

	if(shell instanceof RShellExecutor) {
		return guardRetrievedOutput(shell.run(command), request)
	} else {
		return shell.sendCommandWithOutput(command).then(result =>
			guardRetrievedOutput(result.join(shell.options.eol), request)
		)
	}
}

/**
 * Uses {@link retrieveParseDataFromRCode} and returns the nicely formatted object-AST.
 * If successful, allows further querying the last result with {@link retrieveNumberOfRTokensOfLastParse}.
 */
export async function retrieveNormalizedAstFromRCode(request: RParseRequest, shell: RShell): Promise<NormalizedAst> {
	const data = await retrieveParseDataFromRCode(request, shell)
	return normalize(data)
}

/**
 * If the string has (R-)quotes around it, they will be removed; otherwise the string is returned unchanged.
 */
export function removeRQuotes(str: string): string {
	if(str.length > 1 && (startAndEndsWith(str, '\'') || startAndEndsWith(str, '"'))) {
		return str.slice(1, -1)
	} else {
		return str
	}
}

/**
 * Needs to be called *after*  {@link retrieveParseDataFromRCode} (or {@link retrieveNormalizedAstFromRCode})
 */
export async function retrieveNumberOfRTokensOfLastParse(shell: RShell, ignoreComments = false): Promise<number> {
	const rows = ignoreComments ? `flowr_output[flowr_output$token != "${RawRType.Comment}", ]` : 'flowr_output'
	const result = await shell.sendCommandWithOutput(`cat(nrow(${rows}),${ts2r(shell.options.eol)})`)
	guard(result.length === 1, () => `expected exactly one line to obtain the number of R tokens, but got: ${JSON.stringify(result)}`)
	return Number(result[0])
}

function guardRetrievedOutput(output: string, request: RParseRequest): string {
	guard(output !== ErrorMarker,
		() => `unable to parse R code (see the log for more information) for request ${JSON.stringify(request)}}`)
	return output
}
