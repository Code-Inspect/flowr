/**
 * Provides an environment structure similar to R.
 * This allows the dataflow to hold current definition locations for variables, based on the current scope.
 *
 * @module
 */
import type { NodeId } from '../../r-bridge'
import type { DataflowGraph, DataflowGraphEdgeAttribute } from '../graph'
import { resolveByName } from './resolve-by-name'
import type { DataflowScopeName } from './scopes'
import { GlobalScope, LocalScope } from './scopes'
import type { GenericDifferenceInformation } from '../../util/diff'
import { setDifference } from '../../util/diff'
import { jsonReplacer } from '../../util/json'

/** identifiers are branded to avoid confusion with other string-like types */
export type Identifier = string & { __brand?: 'identifier' }


export const BuiltIn = 'built-in'


/**
 * Stores the definition of an identifier within an {@link IEnvironment}
 */
export interface IdentifierDefinition extends IdentifierReference {
	kind:      'function' | 'variable' | 'parameter' | 'unknown' | 'built-in-function' | 'argument'
	/** The assignment (or whatever, like `assign` function call) node which ultimately defined this identifier */
	definedAt: NodeId
}

/**
 * Something like `a` in `b <- a`.
 * Without any surrounding information, `a` will produce the
 * identifier reference `a` in the current scope (like the global environment).
 * Similarly, `b` will create a reference.
 */
export interface IdentifierReference {
	name:   Identifier,
	scope:  DataflowScopeName,
	/** Node which represents the reference in the AST */
	nodeId: NodeId
	/**
   * Is this reference used in every execution path of the program or only if some of them. This can be too-conservative regarding `maybe`.
   * For example, if we can not detect `if(FALSE)`, this will be `maybe` even if we could statically determine, that the `then` branch is never executed.
   */
	used:   DataflowGraphEdgeAttribute
}

export function diffIdentifierReferences(a: IdentifierReference, b: IdentifierReference, info: GenericDifferenceInformation): void {
	if(a.name !== b.name) {
		info.report.addComment(`${info.position}Different identifier names: ${a.name} vs. ${b.name}`)
	}
	if(a.scope !== b.scope) {
		info.report.addComment(`${info.position}Different scopes: ${a.scope} vs. ${b.scope}`)
	}
	if(a.nodeId !== b.nodeId) {
		info.report.addComment(`${info.position}Different nodeIds: ${a.nodeId} vs. ${b.nodeId}`)
	}
	if(a.used !== b.used) {
		info.report.addComment(`${info.position}Different used: ${a.used} vs. ${b.used}`)
	}
}

export function makeAllMaybe(references: IdentifierReference[] | undefined, graph: DataflowGraph, environments: REnvironmentInformation): IdentifierReference[] {
	if(references === undefined) {
		return []
	}
	return references.map(ref => {
		const node = graph.get(ref.nodeId, true)
		const definitions = resolveByName(ref.name, LocalScope, environments)
		for(const definition of definitions ?? []) {
			if(definition.kind !== 'built-in-function') {
				definition.used = 'maybe'
			}
		}
		if(node) {
			node[0].when = 'maybe'
		}
		return { ...ref, used: 'maybe' }
	})
}


export interface IEnvironment {
	/** unique and internally generated identifier -- will not be used for comparison but assists debugging for tracking identities */
	readonly id:   string
	readonly name: string
	/** Lexical parent of the environment, if any (can be manipulated by R code) */
	parent?:       IEnvironment
	/**
   * Maps to exactly one definition of an identifier if the source is known, otherwise to a list of all possible definitions
   */
	memory:        Map<Identifier, IdentifierDefinition[]>
}

let environmentIdCounter = 0

export class Environment implements IEnvironment {
	readonly name: string
	readonly id:   string = `${environmentIdCounter++}`
	parent?:       IEnvironment
	memory:        Map<Identifier, IdentifierDefinition[]>

	constructor(name: string, parent?: IEnvironment) {
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

export const DefaultEnvironmentMemory = new Map<Identifier, IdentifierDefinition[]>([
	['return', [{
		kind:      'built-in-function',
		scope:     GlobalScope,
		used:      'always',
		definedAt: BuiltIn,
		name:      'return',
		nodeId:    BuiltIn
	}]],
	['cat', [{
		kind:      'built-in-function',
		scope:     GlobalScope,
		used:      'always',
		definedAt: BuiltIn,
		name:      'cat',
		nodeId:    BuiltIn
	}]],
	['print', [{
		kind:      'built-in-function',
		scope:     GlobalScope,
		used:      'always',
		definedAt: BuiltIn,
		name:      'print',
		nodeId:    BuiltIn
	}]],
	['source', [{
		kind:      'built-in-function',
		scope:     GlobalScope,
		used:      'always',
		definedAt: BuiltIn,
		name:      'source',
		nodeId:    BuiltIn
	}]]
])

export function initializeCleanEnvironments(): REnvironmentInformation {
	const global = new Environment(GlobalScope)
	// use a copy
	global.memory = new Map<Identifier, IdentifierDefinition[]>(DefaultEnvironmentMemory)
	return {
		current: global,
		level:   0
	}
}


export function diffEnvironment(a: IEnvironment | undefined, b: IEnvironment | undefined, info: GenericDifferenceInformation): void {
	if(a === undefined || b === undefined) {
		if(a !== b) {
			info.report.addComment(`${info.position}Different environments. ${info.leftname}: ${JSON.stringify(a, jsonReplacer)} vs. ${info.rightname}: ${JSON.stringify(b, jsonReplacer)}`)
		}
		return
	}
	if(a.name !== b.name) {
		info.report.addComment(`${info.position}Different environment names. ${info.leftname}: ${JSON.stringify(a, jsonReplacer)} vs. ${info.rightname}: ${JSON.stringify(b, jsonReplacer)}`)
	}
	if(a.memory.size !== b.memory.size) {
		info.report.addComment(`${info.position}Different environment sizes. ${info.leftname}: ${JSON.stringify(a, jsonReplacer)} vs. ${info.rightname}: ${JSON.stringify(b, jsonReplacer)}`)
		setDifference(new Set([...a.memory.keys()]), new Set([...b.memory.keys()]), { ...info, position: `${info.position}Key comparison. ` })
	}
	for(const [key, value] of a.memory) {
		const value2 = b.memory.get(key)
		if(value2 === undefined || value.length !== value2.length) {
			info.report.addComment(`${info.position}Different definitions for ${key}. ${info.leftname}: ${JSON.stringify(value, jsonReplacer)} vs. ${info.rightname}: ${JSON.stringify(value2, jsonReplacer)}`)
			continue
		}

		for(let i = 0; i < value.length; ++i) {
			const aVal = value[i]
			const bVal = value2[i]
			if(aVal.name !== bVal.name) {
				info.report.addComment(`${info.position}Different names for ${key}. ${info.leftname}: ${aVal.name} vs. ${info.rightname}: ${bVal.name}`)
			}
			if(aVal.nodeId !== bVal.nodeId) {
				info.report.addComment(`${info.position}Different ids for ${key}. ${info.leftname}: ${aVal.nodeId} vs. ${info.rightname}: ${bVal.nodeId}`)
			}
			if(aVal.scope !== bVal.scope) {
				info.report.addComment(`${info.position}Different scopes for ${key}. ${info.leftname}: ${aVal.scope} vs. ${info.rightname}: ${bVal.scope}`)
			}
			if(aVal.used !== bVal.used) {
				info.report.addComment(`${info.position}Different used for ${key}. ${info.leftname}: ${aVal.used} vs. ${info.rightname}: ${bVal.used}`)
			}
			if(aVal.definedAt !== bVal.definedAt) {
				info.report.addComment(`${info.position}Different definition ids (definedAt) for ${key}. ${info.leftname}: ${aVal.definedAt} vs. ${info.rightname}: ${bVal.definedAt}`)
			}
			if(aVal.kind !== bVal.kind) {
				info.report.addComment(`${info.position}Different kinds for ${key}. ${info.leftname}: ${aVal.kind} vs. ${info.rightname}: ${bVal.kind}`)
			}
		}
	}
	diffEnvironment(a.parent, b.parent, { ...info, position: `${info.position}Parents of ${a.id} & ${b.id}. ` })
}

export function diffEnvironments(a: REnvironmentInformation | undefined, b: REnvironmentInformation | undefined, info: GenericDifferenceInformation): void {
	if(a === undefined || b === undefined) {
		info.report.addComment(`${info.position}Different environments: ${JSON.stringify(a, jsonReplacer)} vs. ${JSON.stringify(b, jsonReplacer)}`)
		return
	}
	diffEnvironment(a.current, b.current, info)
}

function cloneEnvironment(environment: IEnvironment, recurseParents: boolean): IEnvironment
function cloneEnvironment(environment: IEnvironment | undefined, recurseParents: boolean): IEnvironment | undefined
function cloneEnvironment(environment: IEnvironment | undefined, recurseParents: boolean): IEnvironment | undefined {
	if(environment === undefined) {
		return undefined
	}
	const clone = new Environment(environment.name, recurseParents ? cloneEnvironment(environment.parent, recurseParents) : environment.parent)
	clone.memory = new Map(JSON.parse(JSON.stringify([...environment.memory])) as [Identifier, IdentifierDefinition[]][])
	return clone
}
export function cloneEnvironments(environment: REnvironmentInformation, recurseParents = true): REnvironmentInformation {
	return {
		current: cloneEnvironment(environment.current, recurseParents),
		level:   environment.level
	}
}
