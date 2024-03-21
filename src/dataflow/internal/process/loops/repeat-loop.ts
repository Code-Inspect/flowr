import type { DataflowInformation } from '../../info'
import type { DataflowProcessorInformation } from '../../../processor'
import { processDataflowFor } from '../../../processor'
import { linkCircularRedefinitionsWithinALoop, produceNameSharedIdMap } from '../../linker'
import type { ParentInformation, RRepeatLoop } from '../../../../r-bridge'

export function processRepeatLoop<OtherInfo>(loop: RRepeatLoop<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo & ParentInformation>): DataflowInformation {
	const body = processDataflowFor(loop.body, data)

	const graph = body.graph
	const namedIdShares = produceNameSharedIdMap([...body.in, ...body.unknownReferences])
	linkCircularRedefinitionsWithinALoop(graph, namedIdShares, body.out)

	return {
		unknownReferences: [],
		in:                [...body.in, ...body.unknownReferences],
		out:               body.out,
		environments:      body.environments,
		scope:             data.activeScope,
		graph:             body.graph
	}
}
