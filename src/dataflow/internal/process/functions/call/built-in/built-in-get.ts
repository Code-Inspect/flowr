import type { DataflowProcessorInformation } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import { processKnownFunctionCall } from '../known-call-handling'
import { unpackArgument } from '../argument/unpack-argument'
import { wrapArgumentsUnnamed } from '../argument/make-argument'
import type { ParentInformation } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RFunctionArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { RSymbol } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import type { NodeId } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/node-id'
import { dataflowLogger } from '../../../../../logger'
import { removeRQuotes } from '../../../../../../r-bridge/retriever'
import { RType } from '../../../../../../r-bridge/lang-4.x/ast/model/type'
import { EdgeType } from '../../../../../graph/edge'

export function processGet<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>,
): DataflowInformation {
	if(args.length !== 1) {
		dataflowLogger.warn(`symbol access with ${name.content} has not 1 argument, skipping`)
		return processKnownFunctionCall({ name, args, rootId, data }).information
	}
	const retrieve = unpackArgument(args[0])
	if(retrieve === undefined || retrieve.type !== RType.String) {
		dataflowLogger.warn(`symbol access with ${name.content} has not 1 argument, skipping`)
		return processKnownFunctionCall({ name, args, rootId, data }).information
	}

	const treatTargetAsSymbol: RSymbol<OtherInfo & ParentInformation> = {
		type:      RType.Symbol,
		info:      retrieve.info,
		content:   removeRQuotes(retrieve.lexeme),
		lexeme:    retrieve.lexeme,
		location:  retrieve.location,
		namespace: undefined
	}

	const { information, processedArguments } = processKnownFunctionCall({
		name,
		args: wrapArgumentsUnnamed([treatTargetAsSymbol], data.completeAst.idMap),
		rootId,
		data
	})

	const firstArg = processedArguments[0]
	if(firstArg) {
		// get 'reads' its first argument
		information.graph.addEdge(rootId, firstArg.entryPoint, { type: EdgeType.Reads })
	}

	return information
}
