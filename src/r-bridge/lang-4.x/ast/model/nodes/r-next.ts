import type { Leaf, Location, NoInfo } from '../model'
import type { RType } from '../type'

export interface RNext<Info = NoInfo> extends Location, Leaf<Info> {
	readonly type: RType.Next;
}
