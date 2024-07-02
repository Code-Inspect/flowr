
import type {
	CommonSyntaxTypeCounts } from '../../common-syntax-probability'
import {
	appendCommonSyntaxTypeCounter,
	emptyCommonSyntaxTypeCounts,
} from '../../common-syntax-probability'
import type { FeatureStatisticsWithMeta } from '../../feature'
import path from 'path'
import fs from 'fs'
import type { FunctionCallInformation, FunctionUsageInfo } from './used-functions'
import { AllCallsFileBase } from './used-functions'
import type { StatisticsSummarizerConfiguration } from '../../../summarizer/summarizer'
import type { SummarizedMeasurement } from '../../../../util/summarizer'
import { summarizedMeasurement2Csv , summarizeMeasurement , summarizedMeasurement2CsvHeader } from '../../../../util/summarizer'
import type { MergeableRecord } from '../../../../util/objects'
import { readLineByLineSync } from '../../../../util/files'
import { date2string } from '../../../../util/time'
import { bigint2number } from '../../../../util/numbers'
import type { StatisticsOutputFormat } from '../../../output/statistics-file'

type FunctionCallSummaryInformation<Measurement, Uniques=number> = [numOfUniqueProjects: Uniques, numOfUniqueFiles: Uniques, total: Measurement, arguments: Measurement, linePercentageInFile: Measurement]
// during the collection phase, this should be a map using an array to collect
interface UsedFunctionMetaPostProcessing<Measurement=SummarizedMeasurement> extends MergeableRecord {
	averageCall:    Measurement
	emptyArgs:      Measurement
	nestedCalls:    Measurement
	deepestNesting: Measurement
	unnamedCalls:   Measurement
	// the first entry is for 1 argument, the second for the two arguments (the second,....)
	args:	          CommonSyntaxTypeCounts<Measurement>[]
}

function retrieveFunctionCallInformation(featureRoot: string, info: Map<string, FeatureStatisticsWithMeta>, config: StatisticsSummarizerConfiguration, outputPath: string) {
	// each number[][] contains a 'number[]' per file
	/**
	 * maps fn-name (including namespace) to number of arguments and their location (the number of elements in the array give the number of total call)
	 * we use tuples to reduce the memory!
	 * A function that is defined within the file is _always_ decorated with the filename (as second array element)!
	 */
	const functionsPerFile = new Map<string | undefined, FunctionCallSummaryInformation<number[][], Set<string>>>()

	const importantFunctions = new Map<string, fs.WriteStream>(
		['parse',
			'eval',
			'deparse',
			'quote',
			'body',
			'formals',
			'body',
			'environment',
			'new.env',
			'assign',
			'get',
			'setGeneric',
			'R6Class'].map(name => [name, fs.createWriteStream(path.join(outputPath, `${name}.csv`))]))

	for(const [, value] of importantFunctions) {
		value.write('filepath,location,namespace,inspected by,classification,notes\n')
	}

	// we collect only `all-calls`
	readLineByLineSync(path.join(featureRoot, `${AllCallsFileBase}.txt`), (line, lineNumber) => processNextLine(functionsPerFile, lineNumber, info, JSON.parse(String(line)) as StatisticsOutputFormat<FunctionCallInformation[]>, config, importantFunctions))

	for(const [, value] of importantFunctions) {
		value.close()
	}
	importantFunctions.clear()

	console.log(`    [${date2string(new Date())}] Used functions process completed, start to write out function info`)

	const fnOutStream = fs.createWriteStream(path.join(outputPath, 'function-calls.csv'))

	const prefixes = ['total', 'args', 'line-frac']
	const others = prefixes.flatMap(summarizedMeasurement2CsvHeader).join(',')
	fnOutStream.write(`function,unique-projects,unique-files,${others}\n`)
	for(const [key, [uniqueProjects, uniqueFiles, total, args, lineFrac]] of functionsPerFile.entries()) {
		const totalSum = summarizeMeasurement(total.flat(), info.size)
		const argsSum = summarizeMeasurement(args.flat(), info.size)
		const lineFracSum = summarizeMeasurement(lineFrac.flat())
		// we write in csv style :), we escape the key in case it contains commas (with filenames)etc.
		fnOutStream.write(`${JSON.stringify(key ?? 'unknown')},${uniqueProjects.size},${uniqueFiles.size},${summarizedMeasurement2Csv(totalSum)},${summarizedMeasurement2Csv(argsSum)},${summarizedMeasurement2Csv(lineFracSum)}\n`)
	}
	fnOutStream.close()
}

function writeFunctionCallsMetaInformationToCsv(outputPath: string, data: UsedFunctionMetaPostProcessing<number[][]>) {
	const out = fs.createWriteStream(path.join(outputPath, 'function-calls-meta.csv'))
	out.write(`kind,unique-projects,unique-files,${summarizedMeasurement2CsvHeader()}\n`)
	out.write(`average-call,${summarizedMeasurement2Csv(summarizeMeasurement(data.averageCall.flat()))}\n`)
	out.write(`nested-calls,${summarizedMeasurement2Csv(summarizeMeasurement(data.nestedCalls.flat()))}\n`)
	out.write(`deepest-nesting,${summarizedMeasurement2Csv(summarizeMeasurement(data.deepestNesting.flat()))}\n`)
	out.write(`empty-args,${summarizedMeasurement2Csv(summarizeMeasurement(data.emptyArgs.flat()))}\n`)
	out.write(`unnamed-calls,${summarizedMeasurement2Csv(summarizeMeasurement(data.unnamedCalls.flat()))}\n`)
	out.close()
}

function retrieveFunctionCallMetaInformation(info: Map<string, FeatureStatisticsWithMeta>, outputPath: string) {
	const data: UsedFunctionMetaPostProcessing<number[][]> = {
		averageCall:    [],
		nestedCalls:    [],
		deepestNesting: [],
		emptyArgs:      [],
		unnamedCalls:   [],
		args:           []
	}
	for(const meta of info.values()) {
		const us = meta.usedFunctions as FunctionUsageInfo
		data.averageCall.push([us.allFunctionCalls])
		data.nestedCalls.push([us.nestedFunctionCalls])
		data.deepestNesting.push([us.deepestNesting])
		data.emptyArgs.push([bigint2number(us.args[0] as bigint)])
		data.unnamedCalls.push([us.unnamedCalls])
		for(const [i, val] of Object.entries(us.args)) {
			if(Number(i) !== 0) {
				let get = data.args[Number(i)] as CommonSyntaxTypeCounts<number[][]> | undefined
				if(!get) {
					get = emptyCommonSyntaxTypeCounts(() => [])
					data.args[Number(i)] = get
				}
				appendCommonSyntaxTypeCounter(get, val as CommonSyntaxTypeCounts)
			}
		}
	}
	console.log(`    [${date2string(new Date())}] Used functions metadata reading completed, summarizing and writing to file`)
	writeFunctionCallsMetaInformationToCsv(outputPath, data)

	for(const [index, arg] of data.args.entries()) {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if(!arg) {
			// we treat the first/0-argument entry separate for legacy reasons
			continue
		}
		const out = fs.createWriteStream(path.join(outputPath, `function-calls-arg-${index}.csv`))
		out.write(`kind,name,${summarizedMeasurement2CsvHeader()}\n`)
		for(const [name, vals] of Object.entries(arg) as [string, number[][] | Record<string, number[][]>][]) {
			if(Array.isArray(vals)) {
				out.write(`${JSON.stringify(name)},"",${summarizedMeasurement2Csv(summarizeMeasurement(vals.flat()))}\n`)
			} else {
				for(const [keyName, keyValue] of Object.entries(vals)) {
					out.write(`${JSON.stringify(name)},${JSON.stringify(keyName)},${summarizedMeasurement2Csv(summarizeMeasurement(keyValue.flat()))}\n`)
				}
			}
		}
		out.close()
	}
}

/**
 * Note: the summary does not contain a 0 for each function that is _not_ called by a file. Hence, the minimum can not be 0 (division for mean etc. will still be performed on total file count)
 */
export function postProcess(featureRoot: string, info: Map<string, FeatureStatisticsWithMeta>, outputPath: string, config: StatisticsSummarizerConfiguration): void {
	retrieveFunctionCallInformation(featureRoot, info, config, outputPath)
	console.log(`    [${date2string(new Date())}] Used functions reading completed, summarizing info...`)
	retrieveFunctionCallMetaInformation(info, outputPath)
}

function processNextLine(data: Map<string | undefined, FunctionCallSummaryInformation<number[][], Set<string>>>, lineNumber: number, info: Map<string, FeatureStatisticsWithMeta>, line: StatisticsOutputFormat<FunctionCallInformation[]>, config: StatisticsSummarizerConfiguration, importants: Map<string, fs.WriteStream>): void {
	if(lineNumber % 2_500 === 0) {
		console.log(`    [${date2string(new Date())}] Used functions processed ${lineNumber} lines`)
	}
	const [hits, context] = line

	// group hits by fullname
	const groupedByFunctionName = new Map<string, FunctionCallSummaryInformation<number[], Set<string>>>()
	for(const [name, loc, args, ns, known] of hits) {
		const importantWrite = name && importants.get(name)
		if(importantWrite) {
			importantWrite.write(`${JSON.stringify(context)},${loc?.[0]??'?'}:${loc?.[1]??'?'},${ns??'""'},,,\n`)
		}
		const fullname = ns && ns !== '' ? `${ns}::${name ?? ''}` : name
		const key = (fullname ?? '') + (known === 1 ? '-' + (context ?? '') : '')

		const stats = info.get(context ?? '')?.stats.lines[0].length

		let get = groupedByFunctionName.get(key)
		if(!get) {
			get = [new Set(), new Set(), [], [], []]
			groupedByFunctionName.set(key, get)
		}
		// we retrieve the first component fo the path
		const projectName = context?.split(path.sep)[config.projectSkip]
		get[0].add(projectName ?? '')
		get[1].add(context ?? '')
		get[2].push(1)
		get[3].push(args)
		if(loc && stats) {
			// we reduce by 1 to get flat 0% if it is the first line
			get[4].push(stats === 1 ? 1 : (loc[0]-1) / (stats-1))
		}
	}

	for(const [key, info] of groupedByFunctionName.entries()) {
		let get = data.get(key)
		if(!get) {
			get = [new Set(), new Set(), [], [], []]
			// an amazing empty structure :D
			data.set(key, get)
		}
		// for total, we only need the number of elements as it will always be one :D
		for(const context of info[0]) {
			get[0].add(context)
		}
		for(const context of info[1]) {
			get[1].add(context)
		}
		get[2].push([info[2].length])
		get[3].push(info[3])
		get[4].push(info[4])
	}
}
