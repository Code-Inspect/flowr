import { DOMParser } from '@xmldom/xmldom'
import fs from 'fs'
import type { MetaStatistics } from './meta-statistics'
import { initialMetaStatistics } from './meta-statistics'
import { log } from '../util/log'
import { jsonReplacer, jsonRetriever } from '../util/json'
import { PipelineExecutor } from '../core/pipeline-executor'
import type { RParseRequest, RParseRequestFromFile, RParseRequestFromText } from '../r-bridge/retriever'
import type { PipelineOutput } from '../core/steps/pipeline/pipeline'
import { DEFAULT_DATAFLOW_PIPELINE } from '../core/steps/pipeline/default-pipelines'
import type { RShell } from '../r-bridge/shell'
import type { Feature, FeatureKey, FeatureSelection, FeatureStatistics } from './features/feature'
import { ALL_FEATURES , allFeatureNames } from './features/feature'
import { ts2r } from '../r-bridge/lang-4.x/convert-values'

/**
 * By default, {@link extractUsageStatistics} requires a generator, but sometimes you already know all the files
 * that you want to process. This function simply reps your requests as a generator.
 */
export function staticRequests(...requests: (RParseRequestFromText | RParseRequestFromFile)[]): AsyncGenerator<RParseRequestFromText | RParseRequestFromFile> {
	// eslint-disable-next-line @typescript-eslint/require-await
	return async function* () {
		for(const request of requests) {
			yield request
		}
	}()
}


type DataflowResult = PipelineOutput<typeof DEFAULT_DATAFLOW_PIPELINE>

/**
 * Extract all wanted statistic information from a set of requests using the presented R session.
 *
 * @param shell     - The R session to use
 * @param onRequest - A callback that is called at the beginning of each request, this may be used to debug the requests.
 * @param features  - The features to extract (see {@link allFeatureNames}).
 * @param requests  - The requests to extract the features from. May generate them on demand (e.g., by traversing a folder).
 * 										If your request is statically known, you can use {@link staticRequests} to create this generator.
 * @param rootPath  - The root path to the project, this is used to relativize the file paths in the statistics.
 */
export async function extractUsageStatistics<T extends RParseRequestFromText | RParseRequestFromFile>(
	shell: RShell,
	onRequest: (request: T) => void,
	features: FeatureSelection,
	requests: AsyncGenerator<T>,
	rootPath?: string
): Promise<{ features: FeatureStatistics, meta: MetaStatistics, outputs: Map<T, DataflowResult> }> {
	let result = initializeFeatureStatistics()
	const meta = initialMetaStatistics()

	const outputs = new Map<T, DataflowResult>()
	for await (const request of requests) {
		onRequest(request)
		const start = performance.now()
		const suffix = request.request === 'file' ? request.content.replace(new RegExp('^' + (rootPath ?? '')), '') : undefined
		try {
			let output
			({ stats: result, output } = await extractSingle(result, shell, request, features, suffix))
			outputs.set(request, output)
			processMetaOnSuccessful(meta, request)
			meta.numberOfNormalizedNodes.push(output.normalize.idMap.size)
		} catch(e) {
			log.error('for request: ', request, e)
			processMetaOnUnsuccessful(meta, request)
		}
		meta.processingTimeMs.push(performance.now() - start)
	}
	return { features: result, meta, outputs }
}

function initializeFeatureStatistics(): FeatureStatistics {
	const result = {} as FeatureStatistics
	for(const key of allFeatureNames) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		result[key] = JSON.parse(JSON.stringify(ALL_FEATURES[key].initialValue, jsonReplacer), jsonRetriever)
	}
	return result
}

function processMetaOnUnsuccessful<T extends RParseRequestFromText | RParseRequestFromFile>(meta: MetaStatistics, request: T) {
	meta.failedRequests.push(request)
}

function processMetaOnSuccessful<T extends RParseRequestFromText | RParseRequestFromFile>(meta: MetaStatistics, request: T) {
	meta.successfulParsed++
	if(request.request === 'text') {
		meta.lines.push(request.content.split('\n').map(l => l.length))
	} else {
		meta.lines.push(fs.readFileSync(request.content, 'utf-8').split('\n').map(l => l.length))
	}
}


const parser = new DOMParser()

async function extractSingle(result: FeatureStatistics, shell: RShell, request: RParseRequest, features: 'all' | Set<FeatureKey>, suffixFilePath: string | undefined): Promise<{ stats: FeatureStatistics, output: DataflowResult}> {
	const slicerOutput = await new PipelineExecutor(DEFAULT_DATAFLOW_PIPELINE, {
		request, shell
	}).allRemainingSteps()

	// retrieve parsed xml through (legacy) xmlparsedata
	const suffix = request.request === 'file' ? ', encoding="utf-8"' : ''
	shell.sendCommands(
		`try(flowr_parsed<-parse(${request.request}=${JSON.stringify(request.content)},keep.source=TRUE${suffix}),silent=FALSE)`,
		'try(flowr_output<-xmlparsedata::xml_parse_data(flowr_parsed,includeText=TRUE,pretty=FALSE),silent=FALSE)',
	)
	const parsed = (await shell.sendCommandWithOutput(`cat(flowr_output,${ts2r(shell.options.eol)})`)).join(shell.options.eol)
	const doc = parser.parseFromString(parsed, 'text/xml')

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	for(const [key, feature] of Object.entries(ALL_FEATURES) as [FeatureKey, Feature<any>][]) {
		if(features !== 'all' && !features.has(key)) {
			continue
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		result[key] = feature.process(result[key], {
			parsedRAst:     doc,
			dataflow:       slicerOutput.dataflow,
			normalizedRAst: slicerOutput.normalize,
			filepath:       suffixFilePath
		})
	}

	return { stats: result, output: slicerOutput }
}
