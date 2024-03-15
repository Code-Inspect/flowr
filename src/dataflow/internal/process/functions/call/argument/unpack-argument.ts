import type { RFunctionArgument, RNode } from '../../../../../../r-bridge'
import { EmptyArgument } from '../../../../../../r-bridge'
import { log } from '../../../../../../util/log'

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
