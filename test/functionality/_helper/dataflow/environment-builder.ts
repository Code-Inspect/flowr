import type { NodeId } from '../../../../src/r-bridge/lang-4.x/ast/model/processing/node-id'
import { normalizeIdToNumberIfPossible } from '../../../../src/r-bridge/lang-4.x/ast/model/processing/node-id'
import type { IdentifierDefinition } from '../../../../src/dataflow/environments/identifier'
import type { FunctionArgument } from '../../../../src/dataflow/graph/graph'
import type { REnvironmentInformation , Environment } from '../../../../src/dataflow/environments/environment'
import { initializeCleanEnvironments } from '../../../../src/dataflow/environments/environment'
import { define } from '../../../../src/dataflow/environments/define'
import { popLocalEnvironment, pushLocalEnvironment } from '../../../../src/dataflow/environments/scoping'
import { appendEnvironment } from '../../../../src/dataflow/environments/append'
import type { ControlDependency } from '../../../../src/dataflow/info'

export function variable(name: string, definedAt: NodeId): IdentifierDefinition {
	return { name, kind: 'variable', nodeId: '_0', definedAt, controlDependencies: undefined }
}

/**
 * Provides a FunctionArgument to use with function call vertices.
 * @param nodeId - AST Node ID
 * @param options - optional allows to give further options
 */
export function argumentInCall(nodeId: NodeId, options?: { name?: string, controlDependencies?: ControlDependency[] }): FunctionArgument {
	return { nodeId: normalizeIdToNumberIfPossible(nodeId), name: options?.name, controlDependencies: options?.controlDependencies?.map(c => ({ ...c, id: normalizeIdToNumberIfPossible(c.id) })) }
}
/**
 * The constant global environment with all pre-defined functions.
 */
export const defaultEnv = () => {
	const global = initializeCleanEnvironments()
	return new EnvironmentBuilder(global.current, 0)
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
	 * @param definedAt - AST Node ID of definition
	 * @param controlDependencies - Control dependencies
	 */
	defineArgument(name: string, nodeId: NodeId, definedAt: NodeId, controlDependencies: ControlDependency[] | undefined = undefined) {
		return this.defineInEnv({
			kind: 'argument',
			name,
			definedAt,
			nodeId,
			controlDependencies })
	}

	/**
	 * Defines a new function in the top environment.
	 * @param name - Function name
	 * @param nodeId - AST Node ID of usage
	 * @param definedAt - AST Node ID of definition
	 * @param controlDependencies - Control dependencies
	 */
	defineFunction(name: string, nodeId: NodeId, definedAt: NodeId, controlDependencies: ControlDependency[] | undefined = undefined) {
		return this.defineInEnv({
			kind: 'function',
			name,
			definedAt,
			nodeId,
			controlDependencies
		})
	}

	/**
	 * Defines a new parameter in the top environment.
	 * @param name - Parameter name
	 * @param nodeId - AST Node ID of usage
	 * @param definedAt - AST Node ID of definition
	 * @param controlDependencies - Control dependencies
	 * */
	defineParameter(name: string, nodeId: NodeId, definedAt: NodeId, controlDependencies: ControlDependency[] | undefined = undefined) {
		return this.defineInEnv({
			kind: 'parameter',
			name,
			definedAt,
			nodeId,
			controlDependencies
		})
	}

	/**
	 * Defines a new parameter in the top environment.
	 * @param name - Variable name
	 * @param nodeId - AST Node ID of usage
	 * @param definedAt - AST Node ID of definition
	 * @param controlDependencies - Control dependencies
	 */
	defineVariable(name: string, nodeId: NodeId, definedAt: NodeId = nodeId, controlDependencies: ControlDependency[] | undefined = undefined) {
		return this.defineInEnv({
			kind: 'variable',
			name,
			definedAt,
			nodeId,
			controlDependencies
		})
	}

	/**
	 * Adds definitions to the current environment.
	 * @param def - Definition to add.
	 * @param superAssignment - If true, the definition is treated as if defined by a super assignment.
	 */
	defineInEnv(def: IdentifierDefinition, superAssignment = false) {
		const envWithDefinition = define({
			...def,
			definedAt:           normalizeIdToNumberIfPossible(def.definedAt),
			nodeId:              normalizeIdToNumberIfPossible(def.nodeId),
			controlDependencies: def.controlDependencies?.map(c => ({ ...c, id: normalizeIdToNumberIfPossible(c.id) }))
		} as IdentifierDefinition, superAssignment, this)
		return new EnvironmentBuilder(envWithDefinition.current, envWithDefinition.level)
	}

	/**
	 * Adds a new, local environment on the environment stack and returns it.
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
	 * Appends the `writes` in other to the given environment
	 * (i.e., those _may_ happen).
	 * @param other - The next environment.
	 */
	appendWritesOf(other: REnvironmentInformation) {
		const appendedEnv = appendEnvironment(this, other)
		return new EnvironmentBuilder(appendedEnv.current, appendedEnv.level)
	}
}
