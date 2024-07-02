import { rangeFrom } from '../../../../../../util/range'
import type { RNode } from '../../../../../../r-bridge/lang-4.x/ast/model/model'
import type { AstIdMap, ParentInformation } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import { EmptyArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { RUnnamedArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-argument'
import { RType } from '../../../../../../r-bridge/lang-4.x/ast/model/type'

const voidRange = rangeFrom(-1, -1, -1, -1)

export function toUnnamedArgument<OtherInfo>(
	node: RNode<OtherInfo & ParentInformation> | undefined,
	idMap: AstIdMap<OtherInfo>
): RUnnamedArgument<OtherInfo & ParentInformation> | typeof EmptyArgument {
	if(node === undefined) {
		return EmptyArgument
	}
	const arg: RUnnamedArgument<OtherInfo & ParentInformation> = {
		type:     RType.Argument,
		lexeme:   node.lexeme ?? '',
		// is this correct?
		location: node.location ?? voidRange,
		info:     {
			...node.info,
			id: node.info.id + '-arg'
		},
		name:  undefined,
		value: node
	}
	idMap.set(arg.info.id, node)
	return arg
}

export function wrapArgumentsUnnamed<OtherInfo>(
	nodes: readonly (RNode<OtherInfo & ParentInformation> | typeof EmptyArgument | undefined)[],
	idMap: AstIdMap<OtherInfo>
) {
	return nodes.map(n => n === EmptyArgument || n?.type === RType.Argument ? n : toUnnamedArgument(n, idMap))
}
