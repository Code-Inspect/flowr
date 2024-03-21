import type { Leaf, Location, NoInfo } from '../model'
import type { RType } from '../type'

export type RLogicalValue = boolean;

export interface RLogical<Info = NoInfo> extends Leaf<Info>, Location {
	readonly type: RType.Logical
	content:       RLogicalValue
}
