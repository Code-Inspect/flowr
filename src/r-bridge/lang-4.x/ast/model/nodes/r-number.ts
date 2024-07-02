import type { Leaf, Location, NoInfo } from '../model'
import type { RType } from '../type'
import type { RNumberValue } from '../../../convert-values'

/** includes numeric, integer, and complex */
export interface RNumber<Info = NoInfo> extends Leaf<Info>, Location {
	readonly type: RType.Number
	content:       RNumberValue
}
