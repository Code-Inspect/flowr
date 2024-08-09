import { initializeCleanDataflowInformation, type DataflowInformation } from '../../info'
import type { DataflowProcessorInformation } from '../../processor'
import type { RNodeWithParent } from '../../../r-bridge/lang-4.x/ast/model/processing/decorate'

export function processUninterestingLeaf<OtherInfo>(leaf: RNodeWithParent, info: DataflowProcessorInformation<OtherInfo>): DataflowInformation {
	return initializeCleanDataflowInformation(leaf.info.id, info)
}
