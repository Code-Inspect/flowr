import type { DataflowProcessorInformation } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import { initializeCleanDataflowInformation } from '../../../../../info'
import { processKnownFunctionCall } from '../known-call-handling'
import { expensiveTrace } from '../../../../../../util/log'
import { processAssignment } from './built-in-assignment'
import { processAllArguments } from '../common'
import { guard } from '../../../../../../util/assert'
import type { ParentInformation } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RSymbol } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import type { RFunctionArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { NodeId } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/node-id'
import { dataflowLogger } from '../../../../../logger'
import { VertexType } from '../../../../../graph/vertex'
import { getReferenceOfArgument } from '../../../../../graph/graph'
import { EdgeType } from '../../../../../graph/edge'
import { graphToMermaidUrl } from '../../../../../../util/mermaid/dfg'

export function processReplacementFunction<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	/** last one has to be the value */
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>,
	config: { makeMaybe?: boolean, assignmentOperator?: '<-' | '<<-' }
): DataflowInformation {
	if(args.length < 2) {
		dataflowLogger.warn(`Replacement ${name.content} has less than 2 arguments, skipping`)
		return processKnownFunctionCall({ name, args, rootId, data }).information
	}

	/* we only get here if <-, <<-, ... or whatever is part of the replacement is not overwritten */
	expensiveTrace(dataflowLogger, () => `Replacement ${name.content} with ${JSON.stringify(args)}, processing`)

	/* we assign the first argument by the last for now and maybe mark as maybe!, we can keep the symbol as we now know we have an assignment */
	const res = processAssignment(name, [args[0], args[args.length - 1]], rootId, data, { superAssignment: config.assignmentOperator === '<<-', makeMaybe: config.makeMaybe })

	/* now, we soft-inject other arguments, so that calls like `x[y] <- 3` are linked correctly */
	const { callArgs } = processAllArguments({
		functionName:   initializeCleanDataflowInformation(rootId, data),
		args:           args.slice(1, -1),
		data,
		functionRootId: rootId,
		finalGraph:     res.graph,
	})
	const fn = res.graph.getVertex(rootId, true)
	guard(fn?.tag === VertexType.FunctionCall && fn.args.length === 2,
		() => `Function ${rootId} not found in graph or not 2-arg fn-call (${JSON.stringify(fn)}) ${graphToMermaidUrl(res.graph)}`
	)
	fn.args = [fn.args[0], ...callArgs, fn.args[1]]


	/* a replacement reads all of its call args as well, at least as far as I am aware of */
	for(const arg of callArgs) {
		const ref = getReferenceOfArgument(arg)
		if(ref !== undefined) {
			res.graph.addEdge(rootId, ref, { type: EdgeType.Reads })
		}
	}

	return res
}

