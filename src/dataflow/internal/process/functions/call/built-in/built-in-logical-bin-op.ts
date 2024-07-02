import type { DataflowProcessorInformation } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import { processKnownFunctionCall } from '../known-call-handling'
import type { ParentInformation } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RFunctionArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { RSymbol } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import type { NodeId } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/node-id'
import { dataflowLogger } from '../../../../../logger'
import { EdgeType } from '../../../../../graph/edge'


export function processSpecialBinOp<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>,
	config: { lazy: boolean, evalRhsWhen: boolean }
): DataflowInformation {
	if(!config.lazy) {
		return processKnownFunctionCall({ name, args, rootId, data }).information
	} else if(args.length != 2) {
		dataflowLogger.warn(`Logical bin-op ${name.content} has something else than 2 arguments, skipping`)
		return processKnownFunctionCall({ name, args, rootId, data }).information
	}

	const { information, processedArguments } = processKnownFunctionCall({ name, args, rootId, data,
		patchData: (d, i) => {
			if(i === 1) {
				return { ...d, controlDependencies: [...d.controlDependencies ?? [], { id: name.info.id, when: config.evalRhsWhen }] }
			}
			return d
		}
	})

	for(const arg of processedArguments) {
		if(arg) {
			information.graph.addEdge(name.info.id, arg.entryPoint, { type: EdgeType.Reads })
		}
		// only do first if lazy
		if(config.lazy) {
			break
		}
	}

	return information
}
