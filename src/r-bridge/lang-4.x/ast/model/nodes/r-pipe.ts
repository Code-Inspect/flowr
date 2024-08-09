import type { Base, Location, NoInfo, RNode } from '../model'
import type { RType } from '../type'

export interface RPipe<Info = NoInfo> extends Base<Info>, Location {
	readonly type: RType.Pipe;
	readonly lhs:  RNode<Info>;
	readonly rhs:  RNode<Info>;
}

