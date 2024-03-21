import type { Base, Location, NoInfo, RNode, WithChildren } from '../model'
import type { RType } from '../type'

export interface RExpressionList<Info = NoInfo> extends WithChildren<Info, RNode<Info>>, Base<Info, string | undefined>, Partial<Location> {
	readonly type:     RType.ExpressionList;
	readonly content?: string;
}

