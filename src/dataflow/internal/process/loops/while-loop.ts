import type { DataflowInformation } from '../../info'
import type { DataflowProcessorInformation } from '../../../processor'
import { processDataflowFor } from '../../../processor'
import {
	appendEnvironments,
	makeAllMaybe,
} from '../../../environments'
import { linkCircularRedefinitionsWithinALoop, linkInputs, produceNameSharedIdMap } from '../../linker'
import type { ParentInformation, RWhileLoop } from '../../../../r-bridge'

export function processWhileLoop<OtherInfo>(loop: RWhileLoop<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo & ParentInformation>): DataflowInformation {
	const condition = processDataflowFor(loop.condition, data)
	data = { ...data, environments: condition.environments }
	const body = processDataflowFor(loop.body, data)

	const environments = condition.environments
	const nextGraph = condition.graph.mergeWith(body.graph)

	const finalEnvironments = appendEnvironments(condition.environments, body.environments)

	// this is theoretically redundant, but we would have to manually mark all affected edges as maybe this way. This does that for us.
	const remainingInputs = linkInputs([
		...makeAllMaybe(body.unknownReferences, nextGraph, finalEnvironments),
		...makeAllMaybe(body.in, nextGraph, finalEnvironments)],
	data.activeScope, environments, [...condition.in, ...condition.unknownReferences], nextGraph, true)

	linkCircularRedefinitionsWithinALoop(nextGraph, produceNameSharedIdMap(remainingInputs), body.out)

	return {
		unknownReferences: [],
		in:                remainingInputs,
		out:               [...makeAllMaybe(body.out, nextGraph, finalEnvironments), ...condition.out],
		graph:             nextGraph,
		/* the body might not happen if the condition is false */
		environments:      finalEnvironments,
		scope:             data.activeScope
	}
}
