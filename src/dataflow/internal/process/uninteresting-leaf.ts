import type { DataflowInformation } from '../info'
import { initializeCleanInfo } from '../info'
import type { DataflowProcessorInformation } from '../../processor'

export function processUninterestingLeaf<OtherInfo>(_leaf: unknown, info: DataflowProcessorInformation<OtherInfo>): DataflowInformation {
	return initializeCleanInfo(info)
}
