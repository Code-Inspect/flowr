import type { DataflowInformation } from '../../../../info'
import type { DataflowProcessorInformation } from '../../../../processor'
import type { ParentInformation, RFunctionCall } from '../../../../../r-bridge'
import { processNamedCall } from './named-call-handling'
import { processUnnamedFunctionCall } from './unnamed-call-handling'


export function processFunctionCall<OtherInfo>(functionCall: RFunctionCall<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo & ParentInformation>): DataflowInformation {
	if(functionCall.flavor === 'named') {
		return processNamedCall(functionCall.functionName, functionCall.arguments, functionCall.info.id, data)
	} else {
		return processUnnamedFunctionCall(functionCall, data)
	}
}
