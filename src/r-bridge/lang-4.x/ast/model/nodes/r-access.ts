import type { Base, Location, NoInfo, RNode } from '../model'
import type { RType } from '../type'
import type { RArgument, RUnnamedArgument } from './r-argument'
import type { EmptyArgument } from './r-function-call'

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
	access:   [RUnnamedArgument<Info>];
}

/** access can be a number, a variable or an expression that resolves to one, a filter etc. */
export interface RIndexAccess<Info = NoInfo> extends RAccessBase<Info> {
	operator: '[' | '[[';
	/** is null if the access is empty, e.g. `a[,3]` */
	access:   readonly (RArgument<Info> | typeof EmptyArgument)[]
}

export type RAccess<Info = NoInfo> = RNamedAccess<Info> | RIndexAccess<Info>

