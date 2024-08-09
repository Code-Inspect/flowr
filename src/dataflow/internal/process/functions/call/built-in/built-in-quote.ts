import { type DataflowProcessorInformation } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import { processKnownFunctionCall } from '../known-call-handling'
import type { ParentInformation } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RFunctionArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { RSymbol } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import type { NodeId } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/node-id'
import type { IdentifierReference } from '../../../../../environments/identifier'
import { EdgeType } from '../../../../../graph/edge'


export function processQuote<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>,
	config?: { quoteArgumentsWithIndex?: number }
): DataflowInformation {
	const { information, processedArguments, fnRef } = processKnownFunctionCall({ name, args, rootId, data })

	const inRefs: IdentifierReference[] = [fnRef]
	const outRefs: IdentifierReference[] = []
	const unknownRefs: IdentifierReference[] = []

	for(let i = 0; i < args.length; i++) {
		const processedArg = processedArguments[i]
		if(processedArg && i !== config?.quoteArgumentsWithIndex) {
			inRefs.push(...processedArg.in)
			outRefs.push(...processedArg.out)
			unknownRefs.push(...processedArg.unknownReferences)
		} else if(processedArg) {
			information.graph.addEdge(rootId, processedArg.entryPoint, { type: EdgeType.NonStandardEvaluation })
		}
	}

	return {
		...information,
		in:                inRefs,
		out:               outRefs,
		unknownReferences: unknownRefs
	}
}
