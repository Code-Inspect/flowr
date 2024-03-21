import type { Leaf, Location, NoInfo } from '../model'
import type { RType } from '../type'

export interface RComment<Info = NoInfo> extends Location, Leaf<Info> {
	readonly type: RType.Comment;
	content:       string;
}
