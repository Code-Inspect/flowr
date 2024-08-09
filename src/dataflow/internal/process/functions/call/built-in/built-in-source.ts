import { RShellExecutor } from '../../../../../../r-bridge/shell-executor'
import { type DataflowProcessorInformation, processDataflowFor } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import { initializeCleanDataflowInformation } from '../../../../../info'
import { getConfig } from '../../../../../../config'
import { normalize } from '../../../../../../r-bridge/lang-4.x/ast/parser/json/parser'
import { processKnownFunctionCall } from '../known-call-handling'
import type { RParseRequestProvider, RParseRequest } from '../../../../../../r-bridge/retriever'
import { retrieveParseDataFromRCode , requestFingerprint , removeRQuotes , requestProviderFromFile } from '../../../../../../r-bridge/retriever'
import type {
	IdGenerator,
	NormalizedAst,
	ParentInformation
} from '../../../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import {
	deterministicPrefixIdGenerator
	,
	sourcedDeterministicCountingIdGenerator
} from '../../../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RFunctionArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import { EmptyArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { RSymbol } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import type { NodeId } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/node-id'
import { dataflowLogger } from '../../../../../logger'
import { RType } from '../../../../../../r-bridge/lang-4.x/ast/model/type'
import { overwriteEnvironment } from '../../../../../environments/overwrite'
import type { NoInfo } from '../../../../../../r-bridge/lang-4.x/ast/model/model'

let sourceProvider = requestProviderFromFile()

export function setSourceProvider(provider: RParseRequestProvider): void {
	sourceProvider = provider
}

export function processSourceCall<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>,
	config: {
		/** should this produce an explicit source function call in the graph? */
		includeFunctionCall?: boolean,
		/** should this function call be followed, even when the configuratio disables it? */
		forceFollow?:         boolean
	}
): DataflowInformation {
	const information = config.includeFunctionCall ?
		processKnownFunctionCall({ name, args, rootId, data }).information
		: initializeCleanDataflowInformation(rootId, data)

	const sourceFile = args[0]

	if(!config.forceFollow && getConfig().ignoreSourceCalls) {
		dataflowLogger.info(`Skipping source call ${JSON.stringify(sourceFile)} (disabled in config file)`)
		return information
	}

	if(sourceFile !== EmptyArgument && sourceFile?.value?.type == RType.String) {
		const path = removeRQuotes(sourceFile.lexeme)
		const request = sourceProvider.createRequest(path)

		// check if the sourced file has already been dataflow analyzed, and if so, skip it
		if(data.referenceChain.includes(requestFingerprint(request))) {
			dataflowLogger.info(`Found loop in dataflow analysis for ${JSON.stringify(request)}: ${JSON.stringify(data.referenceChain)}, skipping further dataflow analysis`)
			return information
		}

		return sourceRequest(request, data, information, sourcedDeterministicCountingIdGenerator(path, name.location))
	} else {
		dataflowLogger.info(`Non-constant argument ${JSON.stringify(sourceFile)} for source is currently not supported, skipping`)
		return information
	}
}

export function sourceRequest<OtherInfo>(request: RParseRequest, data: DataflowProcessorInformation<OtherInfo & ParentInformation>, information: DataflowInformation, getId: IdGenerator<NoInfo>): DataflowInformation {
	const executor = new RShellExecutor()

	// parse, normalize and dataflow the sourced file
	let normalized: NormalizedAst<OtherInfo & ParentInformation>
	let dataflow: DataflowInformation
	try {
		const parsed = retrieveParseDataFromRCode(request, executor)
		normalized = normalize(parsed, getId) as NormalizedAst<OtherInfo & ParentInformation>
		dataflow = processDataflowFor(normalized.ast, {
			...data,
			currentRequest: request,
			environment:    information.environment,
			referenceChain: [...data.referenceChain, requestFingerprint(request)]
		})
	} catch(e) {
		dataflowLogger.warn(`Failed to analyze sourced file ${JSON.stringify(request)}, skipping: ${(e as Error).message}`)
		return information
	}

	// update our graph with the sourced file's information
	const newInformation = { ...information }
	newInformation.environment = overwriteEnvironment(information.environment, dataflow.environment)
	newInformation.graph.mergeWith(dataflow.graph)
	// this can be improved, see issue #628
	for(const [k, v] of normalized.idMap) {
		data.completeAst.idMap.set(k, v)
	}
	return newInformation
}


export function standaloneSourceFile<OtherInfo>(
	inputRequest: RParseRequest,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>,
	uniqueSourceId: string,
	information: DataflowInformation
): DataflowInformation {
	const path = inputRequest.request === 'file' ? inputRequest.content : '-inline-'
	/* this way we can still pass content */
	const request = inputRequest.request === 'file' ? sourceProvider.createRequest(inputRequest.content) : inputRequest
	const fingerprint = requestFingerprint(request)

	// check if the sourced file has already been dataflow analyzed, and if so, skip it
	if(data.referenceChain.includes(fingerprint)) {
		dataflowLogger.info(`Found loop in dataflow analysis for ${JSON.stringify(request)}: ${JSON.stringify(data.referenceChain)}, skipping further dataflow analysis`)
		return information
	}

	return sourceRequest(request, {
		...data,
		currentRequest: request,
		environment:    information.environment,
		referenceChain: [...data.referenceChain, fingerprint]
	}, information, deterministicPrefixIdGenerator(path + '@' + uniqueSourceId))
}
