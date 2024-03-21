import type { Leaf, Location, NoInfo } from '../model'
import type { RType } from '../type'
import type { RStringValue } from '../../../values'

export interface RString<Info = NoInfo> extends Leaf<Info>, Location {
	readonly type: RType.String;
	content:       RStringValue;
}
