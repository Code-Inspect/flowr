import type { FeatureStatisticsWithMeta } from '../../feature'
import type { MergeableRecord } from '@eagleoutice/flowr/util/objects'
import type {
	CommonSyntaxTypeCounts } from '../../common-syntax-probability'
import {
	appendCommonSyntaxTypeCounter,
	emptyCommonSyntaxTypeCounts
} from '../../common-syntax-probability'
import type { AssignmentInfo } from './assignments'
import { bigint2number } from '@eagleoutice/flowr/util/numbers'
import fs from 'fs'
import path from 'path'
import { getUniqueCombinationsOfSize } from '@eagleoutice/flowr/util/arrays'
import { guard } from '@eagleoutice/flowr/util/assert'
import type { StatisticsSummarizerConfiguration } from '../../../summarizer/summarizer'
import { summarizedMeasurement2Csv, summarizedMeasurement2CsvHeader, summarizeMeasurement } from '@eagleoutice/flowr/util/summarizer'

interface OperatorInformation<Measurement, Uniques> {
	uniqueProjects: Uniques
	uniqueFiles:    Uniques
	counts:         Measurement
}
interface SummarizedAssignmentInfo<Measurement, Uniques> extends MergeableRecord {
	assignmentOperator:       Record<string, OperatorInformation<Measurement, Uniques>>
	assigned:                 CommonSyntaxTypeCounts<Measurement>
	deepestNesting:           Measurement
	nestedOperatorAssignment: Measurement
}

function appendOperators(base: SummarizedAssignmentInfo<number[][], Set<string>>, b: Record<string, bigint>, filepath: string, config: StatisticsSummarizerConfiguration): void {
	for(const [key, val] of Object.entries(b)) {
		let get = base.assignmentOperator[key] as OperatorInformation<number[][], Set<string>> | undefined
		if(!get) {
			get = { uniqueFiles: new Set(), uniqueProjects: new Set(), counts: [] }
			base.assignmentOperator[key] = get
		}
		const num = bigint2number(val)
		get.counts.push([num])
		if(num > 0) {
			get.uniqueFiles.add(filepath)
			get.uniqueProjects.add(filepath.split(path.sep)[config.projectSkip] ?? '')
		}
	}
}

// returns a map that for each combination of operators found (like `<-,=`) returns the number of projects and files
// that use both of them
function retrieveUsageCombinationCounts(collected: SummarizedAssignmentInfo<number[][], Set<string>>): Map<string, {uniqueProjects: number, uniqueFiles: number}> {
	const ops = Object.keys(collected.assignmentOperator)
	if(ops.length < 1) {
		return new Map()
	}
	const allCombinations = [...getUniqueCombinationsOfSize(ops, 1)]
	const store = new Map<string, { uniqueProjects: Set<string>, uniqueFiles: Set<string> }>()
	for(const combs of allCombinations) {
		if(combs.length === 1) {
			// we can just copy the information
			const { uniqueProjects, uniqueFiles } = collected.assignmentOperator[combs[0]]
			store.set(combs[0], { uniqueProjects, uniqueFiles })
			continue
		}
		const existingKey = combs.slice(0, -1).join(',')
		const existing = store.get(existingKey)
		guard(existing !== undefined, `Unable to retrieve cache for ${existingKey}`)

		const newKey = combs.join(',')

		const { uniqueProjects, uniqueFiles } = collected.assignmentOperator[combs[combs.length - 1]]
		const newUniqueProjects = new Set([...existing.uniqueProjects].filter(x => uniqueProjects.has(x)))
		const newUniqueFiles = new Set([...existing.uniqueFiles].filter(x => uniqueFiles.has(x)))
		store.set(newKey, { uniqueProjects: newUniqueProjects, uniqueFiles: newUniqueFiles })
	}

	const result = new Map<string, {uniqueProjects: number, uniqueFiles: number}>()
	for(const [key, val] of store.entries()) {
		result.set(key, { uniqueProjects: val.uniqueProjects.size, uniqueFiles: val.uniqueFiles.size })
	}
	return result
}

function writeOperatorCombinationsUsageToCsv(collected: SummarizedAssignmentInfo<number[][], Set<string>>, outputPath: string) {
	// now to get all projects exhausted with _only_ a given subset (e.g., all projects only using '=')
	const operators = retrieveUsageCombinationCounts(collected)
	const out = fs.createWriteStream(path.join(outputPath, 'assignments-assigned-combinations.csv'))
	out.write('assignment,unique-projects,unique-files\n')
	for(const [key, val] of operators.entries()) {
		out.write(`${JSON.stringify(key)},${val.uniqueProjects},${val.uniqueFiles}\n`)
	}
	out.close()
}

function writeAssignmentMetadataToCsv(outputPath: string, collected: SummarizedAssignmentInfo<number[][], Set<string>>) {
	const out = fs.createWriteStream(path.join(outputPath, 'assignments-meta.csv'))
	out.write(`kind,${summarizedMeasurement2CsvHeader()}\n`)
	const summarizedDeepestNesting = summarizeMeasurement(collected.deepestNesting.flat())
	out.write(`deepest-nesting,${summarizedMeasurement2Csv(summarizedDeepestNesting)}\n`)
	const summarizedNestedOperatorAssignment = summarizeMeasurement(collected.nestedOperatorAssignment.flat())
	out.write(`nested-operator-assignment,${summarizedMeasurement2Csv(summarizedNestedOperatorAssignment)}\n`)
	out.close()
}

function writeAssignedTypesToCsv(outputPath: string, collected: SummarizedAssignmentInfo<number[][], Set<string>>) {
	const out = fs.createWriteStream(path.join(outputPath, 'assignments-assigned.csv'))
	out.write(`kind,name,${summarizedMeasurement2CsvHeader()}\n`)
	for(const [entryName, values] of Object.entries(collected.assigned) as [string, number[][] | Record<string, number[][]>][]) {
		if(Array.isArray(values)) {
			out.write(`${JSON.stringify(entryName)},"",${summarizedMeasurement2Csv(summarizeMeasurement(values.flat()))}\n`)
		} else {
			for(const [keyName, keyValue] of Object.entries(values)) {
				out.write(`${JSON.stringify(entryName)},${JSON.stringify(keyName)},${summarizedMeasurement2Csv(summarizeMeasurement(keyValue.flat()))}\n`)
			}
		}
	}
	out.close()
}

function writeAssignmentOperatorsToCsv(outputPath: string, collected: SummarizedAssignmentInfo<number[][], Set<string>>) {
	const fnOutStream = fs.createWriteStream(path.join(outputPath, 'assignments-assignment-operators.csv'))
	fnOutStream.write(`assignment,unique-projects,unique-files,${summarizedMeasurement2CsvHeader()}\n`)
	for(const [key, val] of Object.entries(collected.assignmentOperator)) {
		const { uniqueProjects, uniqueFiles, counts } = val
		const summarized = summarizedMeasurement2Csv(summarizeMeasurement(counts.flat()))
		fnOutStream.write(`${JSON.stringify(key)},${uniqueProjects.size},${uniqueFiles.size},${summarized}\n`)
	}
	fnOutStream.close()
}

export function postProcess(featureRoot: string, info: Map<string, FeatureStatisticsWithMeta>, outputPath: string, config: StatisticsSummarizerConfiguration): void {
	const collected: SummarizedAssignmentInfo<number[][], Set<string>> = {
		assignmentOperator:       {} as Record<string, OperatorInformation<number[][], Set<string>>>,
		assigned:                 emptyCommonSyntaxTypeCounts(() => []),
		deepestNesting:           [],
		nestedOperatorAssignment: []
	}
	for(const [filepath, data] of info.entries()) {
		const assignmentInfo = data.assignments as AssignmentInfo
		collected.deepestNesting.push([assignmentInfo.deepestNesting])
		collected.nestedOperatorAssignment.push([assignmentInfo.nestedOperatorAssignment])
		appendCommonSyntaxTypeCounter(collected.assigned, assignmentInfo.assigned)
		appendOperators(collected, assignmentInfo.assignmentOperator, filepath, config)
	}

	writeAssignmentOperatorsToCsv(outputPath, collected)
	writeOperatorCombinationsUsageToCsv(collected, outputPath)
	writeAssignmentMetadataToCsv(outputPath, collected)
	writeAssignedTypesToCsv(outputPath, collected)
}
