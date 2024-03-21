import type { DataflowInformation } from '../../info'
import type { DataflowProcessorInformation } from '../../../processor'
import { processDataflowFor } from '../../../processor'
import type { ParentInformation, RUnaryOp } from '../../../../r-bridge'

export function processUnaryOp<OtherInfo>(op: RUnaryOp<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo & ParentInformation>): DataflowInformation {
	/* nothing has to happen to our knowledge */
	return processDataflowFor(op.operand, data)
}
