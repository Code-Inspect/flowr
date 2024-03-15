import { EmptyArgument } from '../../../../src'
import { BuiltIn } from '../../../../src/dataflow'
import { UnnamedArgumentPrefix } from '../../../../src/dataflow/internal/process/functions/process-argument'

export function wrap(id: string): string {
	if(id === EmptyArgument) {
		return 'EmptyArgument'
	} else if(id === BuiltIn) {
		return 'BuiltIn'
	} else if(id.startsWith(UnnamedArgumentPrefix)) {
		return `unnamedArgument('${id.slice(UnnamedArgumentPrefix.length)}')`
	} else {
		return `'${id}'`
	}
}
