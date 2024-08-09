import type { DataflowProcessorInformation } from '../../processor'
import type { DataflowInformation } from '../../info'
import { processNamedCall } from './functions/call/named-call-handling'
import { wrapArgumentsUnnamed } from './functions/call/argument/make-argument'
import { RType } from '../../../r-bridge/lang-4.x/ast/model/type'
import type { Base, RNode, Location } from '../../../r-bridge/lang-4.x/ast/model/model'
import type { ParentInformation } from '../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { EmptyArgument } from '../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'

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
