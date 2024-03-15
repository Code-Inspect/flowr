import type { NodeId, ParentInformation, RFunctionArgument, RSymbol } from '../../../../../../r-bridge'
import type { DataflowProcessorInformation } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import {
	linkCircularRedefinitionsWithinALoop, linkInputs,
	produceNameSharedIdMap
} from '../../../../linker'
import { dataflowLogger, makeAllMaybe } from '../../../../../index'
import { processKnownFunctionCall } from '../known-call-handling'
import { guard } from '../../../../../../util/assert'

export function processWhileLoop<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>
): DataflowInformation {
	if(args.length !== 2) {
		dataflowLogger.warn(`While-Loop ${name.content} does not have 2 arguments, skipping`)
		return processKnownFunctionCall(name, args, rootId, data).information
	}

	/* we inject the cf-dependency of the while-loop after the condition */
	const { information, processedArguments } = processKnownFunctionCall(name, args, rootId, data, false, (d, i) => {
		if(i === 1) {
			return { ...d, controlDependency: [...d.controlDependency ?? [], name.info.id] }
		}
		return d
	})
	const [condition, body] = processedArguments

	const originalDependency = data.controlDependency

	guard(condition !== undefined && body !== undefined, () => `While-Loop ${name.content} has no condition or body, impossible!`)

	const remainingInputs = linkInputs([
		...makeAllMaybe(body.unknownReferences, information.graph, information.environment, false),
		...makeAllMaybe(body.in, information.graph, information.environment, false)
	], information.environment, [...condition.in, ...condition.unknownReferences], information.graph, true)
	linkCircularRedefinitionsWithinALoop(information.graph, produceNameSharedIdMap(remainingInputs), body.out)

	// TODO: handle break and next

	return {
		unknownReferences: [],
		in:                [{ nodeId: name.info.id, name: name.lexeme, controlDependency: originalDependency }, ...remainingInputs],
		out:               [...makeAllMaybe(body.out, information.graph, information.environment, true), ...condition.out],
		returns:           [...condition.returns, ...body.returns],
		breaks:            [],
		nexts:             [],
		entryPoint:        name.info.id,
		graph:             information.graph,
		environment:       information.environment
	}
}
