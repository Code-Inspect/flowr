import type { Base, EmptyArgument, Location, ParentInformation, RNode } from '../../../r-bridge'
import { RType } from '../../../r-bridge'
import type { DataflowProcessorInformation } from '../../processor'
import type { DataflowInformation } from '../../info'
import { processNamedFunctionCall } from './functions/call/named-call-handling'
import { wrapArgumentsUnnamed } from './functions/call/argument/make-argument'

export function processAsNamedCall<OtherInfo>(
	op: RNode<OtherInfo & ParentInformation> & Base<OtherInfo> & Location,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>,
	name: string,
	args: readonly (RNode<OtherInfo & ParentInformation> | typeof EmptyArgument | undefined)[]
): DataflowInformation {
	return processNamedFunctionCall({
		type:      RType.Symbol,
		info:      op.info,
		content:   name,
		lexeme:    op.lexeme,
		location:  op.location,
		namespace: undefined
	}, wrapArgumentsUnnamed(args, data.completeAst.idMap), op.info.id, data)
}
