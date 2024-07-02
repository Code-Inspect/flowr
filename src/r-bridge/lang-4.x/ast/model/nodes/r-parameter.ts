import type { Base, Location, NoInfo, RNode } from '../model'
import type { RType } from '../type'
import type { RSymbol } from './r-symbol'

/**
 * Represents a parameter of a function definition in R.
 */
export interface RParameter<Info = NoInfo> extends Base<Info>, Location {
	readonly type: RType.Parameter;
	/* the name is represented as a symbol to additionally get location information */
	name:          RSymbol<Info>;
	/** is it the special ... parameter? */
	special:       boolean;
	defaultValue:  RNode<Info> | undefined;
}
