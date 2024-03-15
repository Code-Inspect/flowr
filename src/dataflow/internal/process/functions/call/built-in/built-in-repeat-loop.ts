import type { NodeId, ParentInformation, RFunctionArgument, RSymbol } from '../../../../../../r-bridge'
import type { DataflowProcessorInformation } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import {
	linkCircularRedefinitionsWithinALoop,
	produceNameSharedIdMap
} from '../../../../linker'
import { dataflowLogger } from '../../../../../index'
import { processKnownFunctionCall } from '../known-call-handling'
import { guard } from '../../../../../../util/assert'

export function processRepeatLoop<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>
): DataflowInformation {
	if(args.length !== 1) {
		dataflowLogger.warn(`Repeat-Loop ${name.content} does not have 1 argument, skipping`)
		return processKnownFunctionCall(name, args, rootId, data).information
	}

	const { information, processedArguments } = processKnownFunctionCall(name, args, rootId, data)

	const body = processedArguments[0]
	guard(body !== undefined, () => `Repeat-Loop ${name.content} has no body, impossible!`)

	const namedIdShares = produceNameSharedIdMap([...body.in, ...body.unknownReferences])
	linkCircularRedefinitionsWithinALoop(information.graph, namedIdShares, body.out)

	return information
}
