import type { Base, EmptyArgument, Location, ParentInformation, RNode } from '../../../r-bridge'
import { RType } from '../../../r-bridge'
import type { DataflowProcessorInformation } from '../../processor'
import type { DataflowInformation } from '../../info'
import { processNamedCall } from './functions/call/named-call-handling'
import { wrapArgumentsUnnamed } from './functions/call/argument/make-argument'

export function processAsNamedCall<OtherInfo>(
	functionName: RNode<OtherInfo & ParentInformation> & Base<OtherInfo> & Location,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>,
	name: string,
	args: readonly (RNode<OtherInfo & ParentInformation> | typeof EmptyArgument | undefined)[]
): DataflowInformation {
	return processNamedCall({
		type:      RType.Symbol,
		info:      functionName.info,
		content:   name,
		lexeme:    functionName.lexeme,
		location:  functionName.location,
		namespace: undefined
	}, wrapArgumentsUnnamed(args, data.completeAst.idMap), functionName.info.id, data)
}
