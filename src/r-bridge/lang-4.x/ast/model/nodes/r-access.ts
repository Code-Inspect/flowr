import type { Base, Location, NoInfo, RNode } from '../model'
import type { RType } from '../type'
import type { RArgument } from './r-argument'

/**
 * Represents an R Indexing operation with `$`, `@`, `[[`, or `[`.
 */
interface RAccessBase<Info = NoInfo> extends Base<Info>, Location {
	readonly type: RType.Access;
	/** the accessed container/variable/expression */
	accessed:      RNode<Info>;
	operator:      '[' | '[[' | '$' | '@';
}

export interface RNamedAccess<Info = NoInfo> extends RAccessBase<Info> {
	operator: '$' | '@';
	access:   string;
}

/** access can be a number, a variable or an expression that resolves to one, a filter etc. */
export interface RIndexAccess<Info = NoInfo> extends RAccessBase<Info> {
	operator: '[' | '[[';
	/** is null if the access is empty, e.g. `a[,3]` */
	access:   (RArgument<Info> | null)[]
}

export type RAccess<Info = NoInfo> = RNamedAccess<Info> | RIndexAccess<Info>

