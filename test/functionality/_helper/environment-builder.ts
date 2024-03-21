import type { NodeId } from '../../../src/r-bridge'
import type { DataflowGraphEdgeAttribute as WhenUsed, FunctionArgument, IdentifierDefinition, REnvironmentInformation, Identifier } from '../../../src/dataflow'
import { appendEnvironments, DefaultEnvironmentMemory, define, Environment, popLocalEnvironment, pushLocalEnvironment, type DataflowScopeName as RScope } from '../../../src/dataflow/environments'
import { GlobalScope, LocalScope } from '../../../src/dataflow/environments/scopes'
import { UnnamedArgumentPrefix } from '../../../src/dataflow/internal/process/functions/argument'

export function variable(name: string, nodeId: NodeId, definedAt: NodeId = nodeId, scope: RScope = LocalScope, used: WhenUsed = 'always'): IdentifierDefinition {
	return { name, kind: 'variable', nodeId, definedAt, scope, used }
}

/**
 * Provides a FunctionArgument to use with function call vertices.
 * @param nodeId - AST Node ID
 * @param name - optional; can be removed for unnamed arguments
 * @param scope - optional; default is LocalScope
 * @param used - optional; default is always
 */
export function argumentInCall(nodeId: NodeId, name?: string, scope: RScope = LocalScope, used: WhenUsed = 'always'): FunctionArgument {
	if(name === undefined) {
		return { nodeId, name: unnamedArgument(nodeId), scope, used }
	} else {
		return [name, { nodeId, name, scope, used }]
	}
}

export function unnamedArgument(id: NodeId) {
	return `${UnnamedArgumentPrefix}${id}`
}

/**
 * The constant global environment with all pre-defined functions.
 */
export const defaultEnvironment = () => {
	const builtIns = new Map<Identifier, IdentifierDefinition[]>(DefaultEnvironmentMemory)
	const globalEnv = new Environment(GlobalScope)
	globalEnv.memory = builtIns
	return new EnvironmentBuilder(globalEnv, 0)
}

/**
 * EnvironmentBuilder extends REnvironmentInformation with builder pattern methods.
 */
export class EnvironmentBuilder implements REnvironmentInformation {
	/**
	 * Use global environment.
	 */
	current: Environment
	/**
	 * Level is 0.
	 */
	level:   number

	constructor(env: Environment, level: number) {
		this.current = env
		this.level = level
	}

	/**
	 * Defines a new argument in the top environment.
	 * @param name - Argument name
	 * @param nodeId - AST Node ID of usage
	 * @param definedAt - AST Node Id of definition
	 * @param scope - local (default) or optional
	 * @param used - always (default) or optional
	 */
	defineArgument(name: string, nodeId: NodeId, definedAt: NodeId, scope: RScope = LocalScope, used: WhenUsed = 'always') {
		return this.defineEnv({ name, kind: 'argument', definedAt, nodeId, scope, used })
	}

	/**
	 * Defines a new function in the top environment.
	 * @param name - Function name
	 * @param nodeId - AST Node ID of usage
	 * @param definedAt - AST Node Id of definition
	 * @param scope - local (default) or optional
	 * @param used - always (default) or optional
	 */
	defineFunction(name: string, nodeId: NodeId, definedAt: NodeId, scope: RScope = LocalScope, used: WhenUsed = 'always') {
		return this.defineEnv({ name, kind: 'function', definedAt, nodeId, scope, used })
	}

	/**
	 * Defines a new parameter in the top environment.
	 * @param name - Parameter name
	 * @param nodeId - AST Node ID of usage
	 * @param definedAt - AST Node Id of definition
	 * @param scope - local (default) or optional
	 * @param used - always (default) or optional
	 */
	defineParameter(name: string, nodeId: NodeId, definedAt: NodeId, scope: RScope = LocalScope, used: WhenUsed = 'always') {
		return this.defineEnv({ name, kind: 'parameter', definedAt, nodeId, scope, used })
	}

	/**
	 * Defines a new parameter in the top environment.
	 * @param name - Variable name
	 * @param nodeId - AST Node Id of usage
	 * @param definedAt - AST Node ID of definition
	 * @param scope - local (default) or optional
	 * @param used - always (default) or optional
	 */
	defineVariable(name: string, nodeId: NodeId, definedAt: NodeId = nodeId, scope: RScope = LocalScope, used: WhenUsed = 'always') {
		return this.defineEnv({ name, kind: 'variable', definedAt, nodeId, scope, used })
	}

	/**
	 * Adds definitions to the current environment.
	 * @param def - Definition to add.
	 */
	defineEnv(def: IdentifierDefinition) {
		const envWithDefinition = define(def, def.scope, this)
		return new EnvironmentBuilder(envWithDefinition.current, envWithDefinition.level)
	}

	/**
	 * Adds a new, local environment on the environment stack and returns it.
	 * @param definitions - Definitions to add to the local environment.
	 */
	pushEnv(): EnvironmentBuilder {
		const newEnvironment = pushLocalEnvironment(this)
		return new EnvironmentBuilder(newEnvironment.current, newEnvironment.level)
	}

	/**
	 * Pops the last environment (must be local) from the environment stack.
	 */
	popEnv(): EnvironmentBuilder {
		const underlyingEnv = popLocalEnvironment(this)
		return new EnvironmentBuilder(underlyingEnv.current, underlyingEnv.level)
	}

	/**
	 * Appends the writes in other to the given environment
	 * (i.e. those _may_ happen).
	 * @param other - The next environment.
	 */
	appendWritesOf(other: REnvironmentInformation) {
		const appendedEnv = appendEnvironments(this, other)
		return new EnvironmentBuilder(appendedEnv.current, appendedEnv.level)
	}
}