import { assertUnreachable, isNotUndefined } from '../../../../src/util/assert'
import { wrap, wrapControlDependencies } from './printer'
import type { IEnvironment, REnvironmentInformation } from '../../../../src/dataflow/environments/environment'
import { BuiltInEnvironment } from '../../../../src/dataflow/environments/environment'
import type { IdentifierDefinition } from '../../../../src/dataflow/environments/identifier'

export class EnvironmentBuilderPrinter {
	private env:   REnvironmentInformation
	private lines: string[] = []

	constructor(env: REnvironmentInformation) {
		this.env = env
	}

	private process() {
		let current = this.env.current
		let i = this.env.level
		while(current !== undefined && current.id !== BuiltInEnvironment.id) {
			if(i-- > 0) {
				this.push()
			}
			this.processEnvironment(current)
			current = current.parent
		}
	}

	private processEnvironment(env: IEnvironment) {
		for(const [name, defs] of env.memory.entries()) {
			for(const def of defs) {
				this.processDefinition(name, def)
			}
		}
	}

	private processDefinition(name: string, def: IdentifierDefinition) {
		const kind = def.kind
		switch(kind) {
			case 'variable':
				this.recordFnCall('defineVariable', [
					wrap(name),
					wrap(def.nodeId),
					wrap(def.definedAt),
					this.getControlDependencyArgument(def)
				])
				break
			case 'function':
				this.recordFnCall('defineFunction', [
					wrap(name),
					wrap(def.nodeId),
					wrap(def.definedAt),
					this.getControlDependencyArgument(def)
				])
				break
			case 'built-in-value':
			case 'built-in-function':
				/* shouldn't happen, only we can define built-in stuff */
				break
			case 'argument':
				this.recordFnCall('defineArgument', [
					wrap(name),
					wrap(def.nodeId),
					wrap(def.definedAt),
					this.getControlDependencyArgument(def)
				])
				break
			case 'parameter':
				this.recordFnCall('defineParameter', [
					wrap(name),
					wrap(def.nodeId),
					wrap(def.definedAt),
					this.getControlDependencyArgument(def)
				])
				break
			default:
				assertUnreachable(kind)
		}
	}

	private getControlDependencyArgument(def: IdentifierDefinition) {
		return def.controlDependencies ? wrapControlDependencies(def.controlDependencies) : undefined
	}

	private push() {
		this.recordFnCall('pushEnv', [])
	}

	private recordFnCall(name: string, args: (string | undefined)[]): void {
		this.lines.push(`.${name}(${args.filter(isNotUndefined).join(', ')})`)
	}

	public print(): string {
		if(this.env.level === 0 && this.env.current.memory.size === 0) {
			return ''
		}
		this.process()
		return 'defaultEnv()' + this.lines.join('')
	}
}
