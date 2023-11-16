import { type RShell } from './shell'
import { ts2r, XmlParserHooks, normalize, NormalizedAst } from './lang-4.x'
import { startAndEndsWith } from '../util/strings'
import { DeepPartial, DeepReadonly } from 'ts-essentials'
import { guard } from '../util/assert'

export interface RParseRequestFromFile {
	request: 'file';
	/** The path to the file (absolute paths are probably best here */
	content: string;
}

export interface RParseRequestFromText {
	request: 'text'
	/* Source code to parse (not a file path) */
	content: string
}

interface RParseRequestBase {
	/**
   * Ensure that all required packages are present and if not install them?
   * The only reason to set this to `false` is probably in a series of parse requests for the same session.
   */
	ensurePackageInstalled: boolean
}

/**
 * A request that can be passed along to {@link retrieveXmlFromRCode}.
 */
export type RParseRequest = (RParseRequestFromFile | RParseRequestFromText) & RParseRequestBase

export function requestFromInput(input: `file://${string}`): RParseRequestFromFile & RParseRequestBase
export function requestFromInput(input: string): RParseRequestFromText & RParseRequestBase

/**
 * Creates a {@link RParseRequest} from a given input.
 */
export function requestFromInput(input: `file://${string}` | string): RParseRequest {
	const file = input.startsWith('file://')
	return {
		request:                file ? 'file' : 'text',
		content:                file ? input.slice(7) : input,
		ensurePackageInstalled: false // should be called within describeSession for that!
	}
}

const ErrorMarker = 'err'

/**
 * Provides the capability to parse R files/R code using the R parser.
 * Depends on {@link RShell} to provide a connection to R.
 * <p>
 * Throws if the file could not be parsed.
 * If successful, allows to further query the last result with {@link retrieveNumberOfRTokensOfLastParse}.
 */
export async function retrieveXmlFromRCode(request: RParseRequest, shell: RShell): Promise<string> {
	if(request.ensurePackageInstalled) {
		await shell.ensurePackageInstalled('xmlparsedata', true)
	}

	const suffix = request.request === 'file' ? ', encoding="utf-8"' : ''

	shell.sendCommands(`extractor_output <- extractor_parsed <- "${ErrorMarker}"`,
		// now, try to retrieve the ast
		`try(extractor_parsed<-parse(${request.request}=${JSON.stringify(request.content)},keep.source=TRUE${suffix}),silent=FALSE)`,
		'try(extractor_output<-xmlparsedata::xml_parse_data(extractor_parsed,includeText=TRUE,pretty=FALSE),silent=FALSE)'
	)
	const xml = await shell.sendCommandWithOutput(`cat(extractor_output,${ts2r(shell.options.eol)})`)
	const output = xml.join(shell.options.eol)
	guard(output !== ErrorMarker, () => `unable to parse R code (see the log for more information) for request ${JSON.stringify(request)}}`)
	return output
}

/**
 * Uses {@link retrieveXmlFromRCode} and returns the nicely formatted object-AST.
 * If successful, allows to further query the last result with {@link retrieveNumberOfRTokensOfLastParse}.
 */
export async function retrieveNormalizedAstFromRCode(request: RParseRequest, shell: RShell, hooks?: DeepPartial<XmlParserHooks>): Promise<NormalizedAst> {
	const xml = await retrieveXmlFromRCode(request, shell)
	return await normalize(xml, await shell.tokenMap(), hooks)
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

export type TokenMap = DeepReadonly<Record<string, string>>

/**
 * Needs to be called *after*  {@link retrieveXmlFromRCode} (or {@link retrieveNormalizedAstFromRCode})
 */
export async function retrieveNumberOfRTokensOfLastParse(shell: RShell): Promise<number> {
	const result = await shell.sendCommandWithOutput(`cat(nrow(getParseData(extractor_parsed)),${ts2r(shell.options.eol)})`)
	guard(result.length === 1, () => `expected exactly one line to obtain the number of R tokens, but got: ${JSON.stringify(result)}`)
	return Number(result[0])
}
