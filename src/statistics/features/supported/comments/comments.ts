import type { Feature, FeatureProcessorInput, Query } from '../../feature'
import * as xpath from 'xpath-ts2'
import type { Writable } from 'ts-essentials'
import { postProcess } from './post-process'
import { guard, isNotNull, isNotUndefined } from '../../../../util/assert'
import { appendStatisticsFile } from '../../../output/statistics-file'


export const initialCommentInfo = {
	totalAmount:       0,
	roxygenComments:   0,
	import:            0,
	importFrom:        0,
	importMethodsFrom: 0,
	importClassesFrom: 0,
	useDynLib:         0,
	export:            0,
	exportClass:       0,
	exportMethod:      0,
	exportS3Method:    0,
	exportPattern:     0
}

export type CommentInfo = Writable<typeof initialCommentInfo>


const commentQuery: Query = xpath.parse('//COMMENT')

const importRegex = /^'\s*@import\s+(?<package>\S+)/
const importFromRegex = /^'\s*@importFrom\s+(?<package>\S+)(?<fn>( +\S+)+)$/
const useDynLibRegex = /^'\s*@useDynLib\s+(?<package>\S+)(?<fn>( +\S+)+)?$/
/** we still name the classes fn, so we can reuse processing code */
const importClassesFromRegex = /^'\s*@importClassesFrom\s+(?<package>\S+)(?<fn>( +\S+)+)$/
const importMethodsFrom = /^'\s*@importMethodsFrom\s+(?<package>\S+)(?<fn>( +\S+)+)$/

/** deliberately includes the others to get a "total" overview */
const exportRegex = /^'\s*@export/
const exportS3MethodRegex = /^'\s*@exportS3Method/
const exportClassRegex = /^'\s*@exportClass/
const exportMethodRegex = /^'\s*@exportMethod/
const exportPatternRegex = /^'\s*@exportPattern/



function processRoxygenImport(existing: CommentInfo, commentsText: string[], filepath: string | undefined) {
	const packages = commentsText.map(text => importRegex.exec(text)?.groups?.package).filter(isNotUndefined)
	existing.import += packages.length
	appendStatisticsFile(comments.name, 'import', packages, filepath, true)
}

function processWithRegex(commentsText: string[], existing: CommentInfo, regex: RegExp): string[] {
	return commentsText.map(text => regex.exec(text)).filter(isNotNull)
		.flatMap(match => {
			const packageName = match.groups?.package ?? '<unknown>'
			return (match.groups?.fn.trim().split(/\s+/) ?? []).map(fn => `${JSON.stringify(packageName)},${fn}`)
		})
}

function processRoxygenImportFrom(existing: CommentInfo, commentsText: string[], filepath: string | undefined) {
	const result = processWithRegex(commentsText, existing, importFromRegex)
	existing.importFrom += result.length
	appendStatisticsFile(comments.name, 'importFrom', result, filepath, true)
}

function processRoxygenImportClassesFrom(existing: CommentInfo, commentsText: string[], filepath: string | undefined) {
	const result = processWithRegex(commentsText, existing, importClassesFromRegex)
	existing.importClassesFrom += result.length
	appendStatisticsFile(comments.name, 'importClassesFrom', result, filepath, true)
}

function processRoxygenImportMethodsFrom(existing: CommentInfo, commentsText: string[], filepath: string | undefined) {
	const result = processWithRegex(commentsText, existing, importMethodsFrom)
	existing.importMethodsFrom += result.length
	appendStatisticsFile(comments.name, 'importMethodsFrom', result, filepath, true)
}

function processExports(existing: CommentInfo, comments: string[]) {
	existing.export += comments.filter(text => exportRegex.test(text)).length
	existing.exportClass += comments.filter(text => exportClassRegex.test(text)).length
	existing.exportMethod += comments.filter(text => exportMethodRegex.test(text)).length
	existing.exportS3Method += comments.filter(text => exportS3MethodRegex.test(text)).length
	existing.exportPattern += comments.filter(text => exportPatternRegex.test(text)).length
}

function processMatchForDynLib(match: RegExpExecArray): string[] {
	const packageName = match.groups?.package ?? '<unknown>'
	const functions = match.groups?.fn?.trim().split(/\s+/) ?? []
	if(functions.length === 0) {
		return [packageName]
	} else {
		return functions.map(fn => `${JSON.stringify(packageName)},${fn}`)
	}
}

function processRoxygenUseDynLib(existing: CommentInfo, commentsText: string[], filepath: string | undefined) {
	const result: string[] = commentsText.map(text => useDynLibRegex.exec(text))
		.filter(isNotNull)
		.flatMap(processMatchForDynLib)

	existing.useDynLib += result.length
	appendStatisticsFile(comments.name, 'useDynLib', result, filepath, true)
}

export const comments: Feature<CommentInfo> = {
	name:        'Comments',
	description: 'All comments that appear within the document',

	process(existing: CommentInfo, input: FeatureProcessorInput): CommentInfo {
		const comments = commentQuery.select({ node: input.parsedRAst }).map(node => node.textContent ?? '#')
			.map(text => {
				guard(text.startsWith('#'), `unexpected comment ${text}`)
				return text.slice(1)
			})
			.map(text => text.trim())
		existing.totalAmount += comments.length

		const roxygenComments = comments.filter(text => text.startsWith("'"))
		existing.roxygenComments += roxygenComments.length

		processRoxygenImport(existing, roxygenComments, input.filepath)
		processRoxygenImportFrom(existing, roxygenComments, input.filepath)
		processRoxygenUseDynLib(existing, roxygenComments, input.filepath)
		processRoxygenImportClassesFrom(existing, roxygenComments, input.filepath)
		processRoxygenImportMethodsFrom(existing, roxygenComments, input.filepath)
		processExports(existing, roxygenComments)

		return existing
	},

	initialValue: initialCommentInfo,
	postProcess:  postProcess
}
