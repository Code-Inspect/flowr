import { Base, Location, NoInfo, RNode } from '../model'
import { RType } from '../type'
import { RSymbol } from './r-symbol'

/**
 * Represents a named or unnamed argument of a function definition in R.
 */
export interface RArgument<Info = NoInfo> extends Base<Info>, Location {
	readonly type: RType.Argument;
	/* the name is represented as a symbol to additionally get location information */
	name:          RSymbol<Info> | undefined;
	value:         RNode<Info>;
}
