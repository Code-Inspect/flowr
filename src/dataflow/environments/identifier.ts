import type { BuiltInIdentifierConstant, BuiltInIdentifierDefinition } from './built-in'
import type { NodeId } from '../../r-bridge/lang-4.x/ast/model/processing/node-id'
import type { ControlDependency } from '../info'

export type Identifier = string & { __brand?: 'identifier' }

interface InGraphIdentifierDefinition extends IdentifierReference {
	kind:      'function' | 'variable' | 'parameter' | 'argument'
	/** The assignment (or whatever, like `assign` function call) node which ultimately defined this identifier */
	definedAt: NodeId
}

/**
 * Stores the definition of an identifier within an {@link IEnvironment}
 */
export type IdentifierDefinition = InGraphIdentifierDefinition | BuiltInIdentifierDefinition | BuiltInIdentifierConstant

/**
 * Something like `a` in `b <- a`.
 * Without any surrounding information, `a` will produce the identifier reference `a`.
 * Similarly, `b` will create a reference.
 */
export interface IdentifierReference {
	/** Node which represents the reference in the AST */
	readonly nodeId:     NodeId
	/** Name the reference is identified by (e.g., the name of the variable), undefined if the reference is "artificial" (e.g., anonymous) */
	readonly name:       Identifier | undefined
	/**
	 * If the reference is only effective if, e.g. an if-then-else condition is true, this references the root of the `if`.
	 * As a hackey intermediate solution (until we have pointer-analysis), an empty array may indicate a `maybe` which is due to pointer access (e.g., in `a[x] <- 3`).
	 */
	controlDependencies: ControlDependency[] | undefined
}
