import type { Base, Location, NoInfo, RNode } from '../model'
import type { RType } from '../type'
import type { RSymbol } from './r-symbol'
import type { RArgument } from './r-argument'

export const EmptyArgument = '<>'

export type RFunctionArgument<Info = NoInfo> = RArgument<Info> | typeof EmptyArgument

/**
 * Calls of functions like `a()` and `foo(42, "hello")`.
 *
 * @see RUnnamedFunctionCall
 */
export interface RNamedFunctionCall<Info = NoInfo> extends Base<Info>, Location {
	readonly type:      RType.FunctionCall;
	readonly named:     true;
	functionName:       RSymbol<Info>;
	/** arguments can be empty, for example when calling as `a(1, ,3)` */
	readonly arguments: readonly RFunctionArgument<Info>[];
}


/**
 * Direct calls of functions like `(function(x) { x })(3)`.
 *
 * @see RNamedFunctionCall
 */
export interface RUnnamedFunctionCall<Info = NoInfo> extends Base<Info>, Location {
	readonly type:      RType.FunctionCall;
	readonly named:     false | undefined;
	calledFunction:     RNode<Info>; /* can be either a function definition or another call that returns a function etc. */
	/** marks function calls like `3 %xx% 4` which have been written in special infix notation; deprecated in v2 */
	infixSpecial?:      boolean;
	/** arguments can be undefined, for example when calling as `a(1, ,3)` */
	readonly arguments: readonly RFunctionArgument<Info>[];
}

export type RFunctionCall<Info = NoInfo> = RNamedFunctionCall<Info> | RUnnamedFunctionCall<Info>;
