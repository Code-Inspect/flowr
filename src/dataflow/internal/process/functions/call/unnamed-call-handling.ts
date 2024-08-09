import type { DataflowProcessorInformation } from '../../../../processor'
import { processDataflowFor } from '../../../../processor'
import type { DataflowInformation } from '../../../../info'
import { processAllArguments } from './common'
import { linkArgumentsOnCall } from '../../../linker'
import type { RUnnamedFunctionCall } from '../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { ParentInformation } from '../../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import { EdgeType } from '../../../../graph/edge'
import { DataflowGraph } from '../../../../graph/graph'
import { VertexType } from '../../../../graph/vertex'
import { RType } from '../../../../../r-bridge/lang-4.x/ast/model/type'
import { dataflowLogger } from '../../../../logger'

export const UnnamedFunctionCallPrefix = 'unnamed-function-call-'

export function processUnnamedFunctionCall<OtherInfo>(functionCall: RUnnamedFunctionCall<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo & ParentInformation>): DataflowInformation {
	const calledFunction = processDataflowFor(functionCall.calledFunction, data)

	const finalGraph = new DataflowGraph(data.completeAst.idMap)
	const functionRootId = functionCall.info.id
	const calledRootId = functionCall.calledFunction.info.id
	const functionCallName = `${UnnamedFunctionCallPrefix}${functionRootId}`
	dataflowLogger.debug(`Using ${functionRootId} as root for the unnamed function call`)
	// we know that it calls the toplevel:
	finalGraph.addEdge(functionRootId, calledRootId, { type: EdgeType.Calls })
	finalGraph.addEdge(functionRootId, calledRootId, { type: EdgeType.Reads })
	// keep the defined function
	finalGraph.mergeWith(calledFunction.graph)

	const {
		finalEnv,
		callArgs,
		remainingReadInArgs
	} = processAllArguments({
		functionName: calledFunction,
		args:         functionCall.arguments,
		data,
		finalGraph,
		functionRootId
	})

	finalGraph.addVertex({
		tag:                 VertexType.FunctionCall,
		id:                  functionRootId,
		environment:         data.environment,
		name:                functionCallName,
		/* can never be a direct built-in-call */
		onlyBuiltin:         false,
		controlDependencies: data.controlDependencies,
		args:                callArgs // same reference
	})

	const inIds = remainingReadInArgs
	inIds.push({ nodeId: functionRootId, name: functionCallName, controlDependencies: data.controlDependencies })

	if(functionCall.calledFunction.type === RType.FunctionDefinition) {
		linkArgumentsOnCall(callArgs, functionCall.calledFunction.parameters, finalGraph)
	}
	// push the called function to the ids:
	inIds.push(...calledFunction.in, ...calledFunction.unknownReferences)

	return {
		unknownReferences: [],
		in:                inIds,
		// we do not keep the argument out as it has been linked by the function
		out:               calledFunction.out,
		graph:             finalGraph,
		environment:       finalEnv,
		entryPoint:        functionCall.info.id,
		exitPoints:        calledFunction.exitPoints
	}
}
