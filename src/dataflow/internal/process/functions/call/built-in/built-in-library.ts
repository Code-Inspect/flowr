import { type DataflowProcessorInformation } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import { processKnownFunctionCall } from '../known-call-handling'
import type { ParentInformation } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RFunctionArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { RSymbol } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import type { NodeId } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/node-id'
import { dataflowLogger } from '../../../../../logger'
import { unpackArgument } from '../argument/unpack-argument'
import type { RString } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-string'
import { RType } from '../../../../../../r-bridge/lang-4.x/ast/model/type'
import { wrapArgumentsUnnamed } from '../argument/make-argument'


export function processLibrary<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>
): DataflowInformation {
	if(args.length !== 1) {
		dataflowLogger.warn(`Currently only one-arg library-likes are allows (for ${name.content}), skipping`)
		return processKnownFunctionCall({ name, args, rootId, data }).information
	}
	const nameToLoad = unpackArgument(args[0])
	if(nameToLoad === undefined || nameToLoad.type !== RType.Symbol) {
		dataflowLogger.warn('No library name provided, skipping')
		return processKnownFunctionCall({ name, args, rootId, data }).information
	}

	// treat as a function call but convert the first argument to a string
	const newArg: RString<OtherInfo & ParentInformation> = {
		type:     RType.String,
		info:     nameToLoad.info,
		lexeme:   nameToLoad.lexeme,
		location: nameToLoad.location,
		content:  {
			quotes: 'none',
			str:    nameToLoad.content
		}
	}

	return processKnownFunctionCall({ name, args: wrapArgumentsUnnamed([newArg], data.completeAst.idMap), rootId, data }).information
}
