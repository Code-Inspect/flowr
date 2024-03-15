import type { NodeId, ParentInformation, RFunctionArgument, RSymbol } from '../../../../../r-bridge'
import type { DataflowProcessorInformation } from '../../../../processor'
import type { DataflowInformation } from '../../../../info'
import { initializeCleanDataflowInformation } from '../../../../info'
import { processKnownFunctionCall } from './known-call-handling'
import { appendEnvironment, resolveByName } from '../../../../environments'


function mergeInformation(info: DataflowInformation | undefined, newInfo: DataflowInformation): DataflowInformation {
	if(info === undefined) {
		return newInfo
	}

	// TODO: remove duplicate in, out and unknownReferences
	return {
		unknownReferences: [...info.unknownReferences, ...newInfo.unknownReferences],
		in:                [...info.in, ...newInfo.in],
		out:               [...info.out, ...newInfo.out],
		graph:             info.graph.mergeWith(newInfo.graph),
		environment:       appendEnvironment(info.environment, newInfo.environment),
		entryPoint:        newInfo.entryPoint,
		returns:           [...info.returns, ...newInfo.returns],
		breaks:            [...info.breaks, ...newInfo.breaks],
		nexts:             [...info.nexts, ...newInfo.nexts]
	}
}

export function processNamedCall<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>
): DataflowInformation {
	const resolved = resolveByName(name.content, data.environment) ?? []
	let defaultProcessor = resolved.length === 0

	let information: DataflowInformation | undefined = undefined
	let builtIn = false
	for(const resolvedFunction of resolved) {
		if(resolvedFunction.kind === 'built-in-function') {
			builtIn = true
			information = mergeInformation(information, resolvedFunction.processor(name, args, rootId, data))
		} else {
			defaultProcessor = true
		}
	}
	if(defaultProcessor) {
		information = mergeInformation(information, processKnownFunctionCall(name, args, rootId, data).information)
	} else if(builtIn) {
		// mark the function call as built in only
		const v = (information as DataflowInformation).graph.get(name.info.id)
		if(v !== undefined && v[0].tag === 'function-call') {
			v[0].onlyBuiltin = true
		}
	}


	return information ?? initializeCleanDataflowInformation(data)
}
