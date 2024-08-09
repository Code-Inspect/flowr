import type { DataflowInformation } from '../../../../info'
import type { DataflowProcessorInformation } from '../../../../processor'
import { processNamedCall } from './named-call-handling'
import { processUnnamedFunctionCall } from './unnamed-call-handling'
import type { ParentInformation } from '../../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RFunctionCall } from '../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'


export function processFunctionCall<OtherInfo>(functionCall: RFunctionCall<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo & ParentInformation>): DataflowInformation {
	if(functionCall.named) {
		return processNamedCall(functionCall.functionName, functionCall.arguments, functionCall.info.id, data)
	} else {
		return processUnnamedFunctionCall(functionCall, data)
	}
}
