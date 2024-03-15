import { type RShell } from './shell'
import type { NormalizedAst } from './lang-4.x'
import { ts2r } from './lang-4.x'
import { startAndEndsWith } from '../util/strings'
import type { AsyncOrSync } from 'ts-essentials'
import { guard } from '../util/assert'
import { RShellExecutor } from './shell-executor'
import objectHash from 'object-hash'
import { normalize } from './lang-4.x/ast/parser/json/parser'
import { ErrorMarker } from './init'

export interface RParseRequestFromFile {
	readonly request:  'file';
	/** The path to the file (absolute paths are probably best here) */
	readonly  content: string;
}

export interface RParseRequestFromText {
	readonly request: 'text'
	/* Source code to parse (not a file path) */
	readonly content: string
}

/**
 * A provider for an {@link RParseRequest} that can be used, for example, to override source file parsing behavior in tests
 */
export interface RParseRequestProvider {
	createRequest(path: string): RParseRequest
}

/**
 * A request that can be passed along to {@link retrieveParseDataFromRCode}.
 */
export type RParseRequest = (RParseRequestFromFile | RParseRequestFromText)

export function requestFromInput(input: `file://${string}`): RParseRequestFromFile
export function requestFromInput(input: string): RParseRequestFromText

/**
 * Creates a {@link RParseRequest} from a given input.
 */
export function requestFromInput(input: `file://${string}` | string): RParseRequest {
	const file = input.startsWith('file://')
	return {
		request: file ? 'file' : 'text',
		content: file ? input.slice(7) : input
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

export function requestProviderFromText(text: {[path: string]: string}): RParseRequestProvider{
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

/**
 * Provides the capability to parse R files/R code using the R parser.
 * Depends on {@link RShell} to provide a connection to R.
 * <p>
 * Throws if the file could not be parsed.
 * If successful, allows to further query the last result with {@link retrieveNumberOfRTokensOfLastParse}.
 */
export function retrieveParseDataFromRCode(request: RParseRequest, shell: (RShell | RShellExecutor)): AsyncOrSync<string> {
	if(request.content.trim() === '') {
		return Promise.resolve('')
	}
	const suffix = request.request === 'file' ? ', encoding="utf-8"' : ''
	/* call the function with the request */
	const command =`flowr_get_ast(${request.request}=${JSON.stringify(request.content)}${suffix})`

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
 * If successful, allows to further query the last result with {@link retrieveNumberOfRTokensOfLastParse}.
 */
export async function retrieveNormalizedAstFromRCode(request: RParseRequest, shell: RShell): Promise<NormalizedAst> {
	const data = await retrieveParseDataFromRCode(request, shell)
	return normalize(data)
}

/**
 * If the string has (R-)quotes around it, they will be removed, otherwise the string is returned unchanged.
 */
export function removeTokenMapQuotationMarks(str: string): string {
	if(str.length > 1 && (startAndEndsWith(str, '\'') || startAndEndsWith(str, '"'))) {
		return str.slice(1, -1)
	} else {
		return str
	}
}

/**
 * Needs to be called *after*  {@link retrieveParseDataFromRCode} (or {@link retrieveNormalizedAstFromRCode})
 */
export async function retrieveNumberOfRTokensOfLastParse(shell: RShell): Promise<number> {
	const result = await shell.sendCommandWithOutput(`cat(nrow(flowr_output),${ts2r(shell.options.eol)})`)
	guard(result.length === 1, () => `expected exactly one line to obtain the number of R tokens, but got: ${JSON.stringify(result)}`)
	return Number(result[0])
}

function guardRetrievedOutput(output: string, request: RParseRequest): string {
	guard(output !== ErrorMarker,
		() => `unable to parse R code (see the log for more information) for request ${JSON.stringify(request)}}`)
	return output
}
