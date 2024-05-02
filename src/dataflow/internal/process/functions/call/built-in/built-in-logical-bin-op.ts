import type {
	NodeId,
	ParentInformation,
	RFunctionArgument,
	RSymbol
} from '../../../../../../r-bridge'
import type { DataflowProcessorInformation } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import { dataflowLogger, EdgeType } from '../../../../../index'
import { processKnownFunctionCall } from '../known-call-handling'


export function processSpecialBinOp<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>,
	config: { lazy: boolean }
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
			// the rhs will be overshadowed by the lhs
				return { ...d, controlDependency: [...d.controlDependency ?? [], name.info.id] }
			}
			return d
		}
	})

	// TODO: allow to configure to read all arguments
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
