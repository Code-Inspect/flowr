import type { NodeId, ParentInformation, RFunctionArgument, RSymbol } from '../../../../../r-bridge'
import type { DataflowProcessorInformation } from '../../../../processor'
import { processDataflowFor } from '../../../../processor'
import type { DataflowInformation } from '../../../../info'
import { DataflowGraph } from '../../../../graph'
import type { IdentifierReference } from '../../../../index'
import { dataflowLogger } from '../../../../index'
import { processAllArguments } from './common'

export function processKnownFunctionCall<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>,
	/* should arguments be processed from right to left? This does not affect the order recorded in the call but of the environments */
	reverseOrder?: boolean,
	/* allows to pass a data processor in-between each argument */
	patchData: (data: DataflowProcessorInformation<OtherInfo & ParentInformation>, arg: number) => DataflowProcessorInformation<OtherInfo & ParentInformation> = d => d
): { information: DataflowInformation, processedArguments: readonly (DataflowInformation | undefined)[], fnRef: IdentifierReference } {
	const functionName = processDataflowFor(name, data)

	const finalGraph = new DataflowGraph()
	const functionCallName = name.content
	dataflowLogger.debug(`Using ${rootId} (name: ${functionCallName}) as root for the named function call`)

	const processArgs = reverseOrder ? args.toReversed() : args

	const {
		finalEnv,
		callArgs,
		remainingReadInArgs,
		processedArguments
	} = processAllArguments(functionName, processArgs, data, finalGraph, rootId, patchData)

	finalGraph.addVertex({
		tag:               'function-call',
		id:                rootId,
		name:              functionCallName,
		environment:       data.environment,
		/* will be overwritten accordingly */
		onlyBuiltin:       false,
		controlDependency: data.controlDependency,
		args:              reverseOrder ? callArgs.toReversed() : callArgs
	})

	const inIds = remainingReadInArgs
	const fnRef = { nodeId: rootId, name: functionCallName, controlDependency: data.controlDependency }
	inIds.push(fnRef)

	return {
		information: {
			unknownReferences: [],
			in:                inIds,
			out:               functionName.out, // we do not keep argument out as it has been linked by the function
			graph:             finalGraph,
			environment:       finalEnv,
			entryPoint:        name.info.id,
			returns:           [],
			breaks:            [],
			nexts:             []
		},
		processedArguments: reverseOrder ? processedArguments.toReversed() : processedArguments,
		fnRef
	}
}
