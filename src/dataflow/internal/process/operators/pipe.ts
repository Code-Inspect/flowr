import type { DataflowInformation } from '../../info'
import type { DataflowProcessorInformation } from '../../../processor'
import { processDataflowFor } from '../../../processor'
import { linkIngoingVariablesInSameScope } from '../../linker'
import type { ParentInformation, RPipe } from '../../../../r-bridge'
import { RType } from '../../../../r-bridge'
import { overwriteEnvironments } from '../../../environments'
import { dataflowLogger, EdgeType, graphToMermaidUrl } from '../../../index'
import { guard } from '../../../../util/assert'
import { UnnamedArgumentPrefix } from '../functions/argument'

export function processPipeOperation<OtherInfo>(op: RPipe<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo & ParentInformation>): DataflowInformation {
	const lhs = processDataflowFor(op.lhs, data)
	const rhs = processDataflowFor(op.rhs, data)

	// in-and outgoing are similar to that of a binary operation, we only 1) expect the rhs to be a function call and 2) modify the arguments.
	const ingoing = [...lhs.in, ...rhs.in, ...lhs.unknownReferences, ...rhs.unknownReferences]
	const nextGraph = lhs.graph.mergeWith(rhs.graph)
	linkIngoingVariablesInSameScope(nextGraph, ingoing)
	if(op.rhs.type !== RType.FunctionCall) {
		dataflowLogger.warn(`Expected rhs of pipe to be a function call, but got ${op.rhs.type} instead.`)
	} else {
		const maybeFunctionCallNode = nextGraph.get(op.rhs.info.id, true)
		guard(maybeFunctionCallNode !== undefined, () => `Expected function call node with id ${op.rhs.info.id} to be present in graph, but got undefined instead (graph: ${graphToMermaidUrl(nextGraph, data.completeAst.idMap)}).`)


		const functionCallNode = maybeFunctionCallNode[0]
		guard(functionCallNode.tag === 'function-call', () => `Expected function call node with id ${op.rhs.info.id} to be a function call node, but got ${functionCallNode.tag} instead.`)

		// make the lhs an argument node:
		const argId =  op.lhs.info.id

		dataflowLogger.trace(`Linking pipe arg ${argId} as first argument of ${op.rhs.info.id}`)
		functionCallNode.args.unshift({
			nodeId: argId,
			name:   `${UnnamedArgumentPrefix}${argId}`,
			scope:  data.activeScope,
			used:   'always'
		})
		nextGraph.addEdge(functionCallNode.id, argId, EdgeType.Argument, 'always')
	}

	return {
		unknownReferences: [],
		in:                ingoing,
		out:               [...lhs.out, ...rhs.out],
		environments:      overwriteEnvironments(lhs.environments, rhs.environments),
		graph:             nextGraph,
		scope:             data.activeScope,
	}
}
