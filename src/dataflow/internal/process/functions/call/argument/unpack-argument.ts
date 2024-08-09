import { log } from '../../../../../../util/log'
import type { RFunctionArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import { EmptyArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { RNode } from '../../../../../../r-bridge/lang-4.x/ast/model/model'

export function unpackArgument<OtherInfo>(arg: RFunctionArgument<OtherInfo>): RNode<OtherInfo> | undefined {
	if(arg === EmptyArgument) {
		log.trace('Argument is empty, skipping')
		return undefined
	} else if(arg.name !== undefined) {
		log.trace(`Argument ${JSON.stringify(arg)} is not unnamed, skipping`)
		return undefined
	}
	return arg.value
}
