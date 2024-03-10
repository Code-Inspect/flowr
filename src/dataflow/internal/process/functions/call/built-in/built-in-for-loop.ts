import type { NodeId, ParentInformation, RFunctionArgument, RSymbol } from '../../../../../../r-bridge'
import type { DataflowProcessorInformation } from '../../../../../processor'
import { processDataflowFor } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import { appendEnvironment, define, makeAllMaybe, overwriteEnvironment } from '../../../../../environments'
import {
	linkCircularRedefinitionsWithinALoop,
	linkIngoingVariablesInSameScope,
	produceNameSharedIdMap
} from '../../../../linker'
import { EdgeType } from '../../../../../graph'
import { dataflowLogger } from '../../../../../index'
import { processKnownFunctionCall } from '../known-call-handling'
import { unpackArgument } from '../argument/unpack-argument'
import { guard } from '../../../../../../util/assert'

export function processForLoop<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>
): DataflowInformation {
	if(args.length !== 3) {
		dataflowLogger.warn(`For-Loop ${name.content} does not have 3 arguments, skipping`)
		return processKnownFunctionCall(name, args, rootId, data).information
	}

	const [variableArg, vectorArg, bodyArg] = args.map(unpackArgument)

	guard(variableArg !== undefined && vectorArg !== undefined && bodyArg !== undefined, () => `For-Loop ${JSON.stringify(args)} has missing arguments! Bad!`)

	const variable = processDataflowFor(variableArg, data)
	const vector = processDataflowFor(vectorArg, data)
	let headEnvironments = overwriteEnvironment(vector.environment, variable.environment)
	const headGraph= variable.graph.mergeWith(vector.graph)

	const writtenVariable = variable.unknownReferences
	for(const write of writtenVariable) {
		headEnvironments = define({ ...write, definedAt: name.info.id, kind: 'variable' }, false, headEnvironments)
	}
	data = { ...data, environment: headEnvironments }
	const body = processDataflowFor(bodyArg, data)

	const nextGraph = headGraph.mergeWith(body.graph)

	const outEnvironment = appendEnvironment(headEnvironments, body.environment)

	// again within an if-then-else we consider all actives to be read
	// currently I add it at the end, but is this correct?
	const ingoing = [...vector.in, ...makeAllMaybe(body.in, nextGraph, outEnvironment), ...vector.unknownReferences, ...makeAllMaybe(body.unknownReferences, nextGraph, outEnvironment)]


	// now we have to bind all open reads with the given name to the locally defined writtenVariable!
	const nameIdShares = produceNameSharedIdMap(ingoing)

	for(const write of writtenVariable) {
		for(const link of [...vector.in, ...vector.unknownReferences]) {
			nextGraph.addEdge(write.nodeId, link.nodeId, { type: EdgeType.DefinedBy })
		}

		const name = write.name
		if(name) {
			const readIdsToLink = nameIdShares.get(name)
			for(const readId of readIdsToLink) {
				nextGraph.addEdge(readId.nodeId, write.nodeId, { type: EdgeType.Reads })
			}
			// now, we remove the name from the id shares as they are no longer needed
			nameIdShares.delete(name)
			nextGraph.setDefinitionOfVertex(write)
		}
	}

	const outgoing = [...variable.out, ...writtenVariable, ...makeAllMaybe(body.out, nextGraph, outEnvironment)]

	linkIngoingVariablesInSameScope(nextGraph, ingoing)

	linkCircularRedefinitionsWithinALoop(nextGraph, nameIdShares, body.out)

	return {
		unknownReferences: [],
		// we only want those not bound by a local variable
		in:                [...variable.in, ...[...nameIdShares.values()].flat()],
		out:               outgoing,
		graph:             nextGraph,
		environment:       outEnvironment
	}
}
