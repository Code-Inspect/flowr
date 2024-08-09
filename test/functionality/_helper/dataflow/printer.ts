import {
	UnnamedFunctionCallPrefix
} from '../../../../src/dataflow/internal/process/functions/call/unnamed-call-handling'
import { EmptyArgument } from '../../../../src/r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { NodeId } from '../../../../src/r-bridge/lang-4.x/ast/model/processing/node-id'
import { BuiltIn } from '../../../../src/dataflow/environments/built-in'
import type { IdentifierReference } from '../../../../src/dataflow/environments/identifier'
import type { ControlDependency } from '../../../../src/dataflow/info'

export function wrap(id: string | NodeId | undefined): string {
	if(id === undefined) {
		return 'undefined'
	} else if(id === EmptyArgument) {
		return 'EmptyArgument'
	} else if(id === BuiltIn) {
		return 'BuiltIn'
	} else if(typeof id === 'string' && id.startsWith(UnnamedFunctionCallPrefix)) {
		return `\`\${UnnamedFunctionCallPrefix}${id.slice(UnnamedFunctionCallPrefix.length)}\``
	} else {
		return `'${id}'`
	}
}

export function wrapControlDependencies(controlDependencies: ControlDependency[] | undefined): string {
	if(controlDependencies === undefined) {
		return 'undefined'
	} else {
		return `[${controlDependencies.map(c =>
			`{ id: ${wrap(c.id)}, when: ${c.when} }`	
		).join(', ')}]`
	}
}
export function wrapReference(ref: IdentifierReference): string {
	return `{ nodeId: ${wrap(ref.nodeId)}, name: ${wrap(ref.name)}, controlDependencies: ${wrapControlDependencies(ref.controlDependencies)} }`
}
