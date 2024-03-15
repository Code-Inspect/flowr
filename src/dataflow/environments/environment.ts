/**
 * Provides an environment structure similar to R.
 * This allows the dataflow to hold current definition locations for variables, based on the current scope.
 *
 * @module
 */
import type { DataflowGraph } from '../'
import { resolveByName } from './resolve-by-name'
import type { Identifier, IdentifierDefinition, IdentifierReference } from './identifier'
import { BuiltInMemory } from './built-in'


export function makeReferenceMaybe(ref: IdentifierReference, graph: DataflowGraph, environments: REnvironmentInformation, includeDefs: boolean): IdentifierReference {
	const node = graph.get(ref.nodeId, true)
	if(includeDefs) {
		const definitions = ref.name ? resolveByName(ref.name, environments) : undefined
		for(const definition of definitions ?? []) {
			if(definition.kind !== 'built-in-function' && definition.kind !== 'built-in-value') {
				definition.controlDependency ??= []
			}
		}
	}
	if(node) {
		node[0].controlDependency ??= []
	}
	return { ...ref, controlDependency: ref.controlDependency ?? [] }
}

export function makeAllMaybe(references: readonly IdentifierReference[] | undefined, graph: DataflowGraph, environments: REnvironmentInformation, includeDefs: boolean): IdentifierReference[] {
	if(references === undefined) {
		return []
	}
	return references.map(ref => makeReferenceMaybe(ref, graph, environments, includeDefs))
}


export interface IEnvironment {
	/** unique and internally generated identifier -- will not be used for comparison but assists debugging for tracking identities */
	readonly id:   string
	readonly name: string
	/** Lexical parent of the environment, if any (can be manipulated by R code) */
	parent:        IEnvironment
	/**
   * Maps to exactly one definition of an identifier if the source is known, otherwise to a list of all possible definitions
   */
	memory:        Map<Identifier, IdentifierDefinition[]>
}

let environmentIdCounter = 0

export class Environment implements IEnvironment {
	readonly name: string
	readonly id:   string = `${environmentIdCounter++}`
	parent:        IEnvironment
	memory:        Map<Identifier, IdentifierDefinition[]>

	constructor(name: string, parent: IEnvironment) {
		this.name   = name
		this.parent = parent
		this.memory = new Map()
	}
}

/**
 * First of all, yes, R stores its environments differently, potentially even with a different differentiation between
 * the `baseenv`, the `emptyenv`and other default environments. Yet, during dataflow we want sometimes to know more (static
 * reference information) and sometimes know less (to be honest we do not want that,
 * but statically determining all attached environments is theoretically impossible --- consider attachments by user input).
 * One example would be maps holding a potential list of all definitions of a variable, if we do not know the execution path (like with `if(x) A else B`).
 */
export interface REnvironmentInformation {
	/**  The currently active environment (the stack is represented by the currently active {@link IEnvironment#parent}). Environments are maintained within the dataflow graph. */
	readonly current: IEnvironment
	/** nesting level of the environment, will be `0` for the global/root environment */
	readonly level:   number
}


/* the built-in environment is the root of all environments */
export const BuiltInEnvironment = new Environment('built-in', undefined as unknown as IEnvironment)

BuiltInEnvironment.memory = BuiltInMemory

export function initializeCleanEnvironments(): REnvironmentInformation {
	const global = new Environment('global', BuiltInEnvironment)
	return {
		current: global,
		level:   0
	}
}


