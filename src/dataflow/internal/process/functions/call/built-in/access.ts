import type { NodeId, ParentInformation, RFunctionArgument, RSymbol } from '../../../../../../r-bridge'
import { EmptyArgument } from '../../../../../../r-bridge'
import type { DataflowProcessorInformation } from '../../../../../processor'
import { processDataflowFor } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import { makeAllMaybe } from '../../../../../environments'
import { dataflowLogger } from '../../../../../index'
import { guard } from '../../../../../../util/assert'
import { processKnownFunctionCall } from '../known-call-handling'

export function processAccess<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>
): DataflowInformation {

	if(args.length < 2) {
		dataflowLogger.warn(`Access ${name.content} has less than 2 arguments, skipping`)
		return processKnownFunctionCall(name, args, rootId, data)
	}
	guard(args[0] !== EmptyArgument, () => `Access ${name.content} has no source, impossible!`)

	let information: DataflowInformation | undefined
	// if we are here we know we are processing a built-in
	if(name.content === '[' || name.content === '[[') {
		information = processKnownFunctionCall(name, args, rootId, data)
	} else {
		// we ignore the arguments here as they are not used in the access
		information = processDataflowFor(args[0], data)
	}

	return {
		...information,
		/*
     * keep active nodes in case of assignments etc.
     * We make them maybe as a kind of hack.
     * This way when using
     * ```ts
     * a[[1]] <- 3
     * a[[2]] <- 4
     * a
     * ```
     * the read for a will use both accesses as potential definitions and not just the last one!
     */
		unknownReferences: makeAllMaybe(information.unknownReferences, information.graph, information.environment)
	}
}
