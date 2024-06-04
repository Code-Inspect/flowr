import { Handler } from '../handler'
import type { DataflowInformation } from '../../../dataflow/info'
import type { AINodeStore } from '../../ainode'

export class ExprList extends Handler {
	constructor(dfg: DataflowInformation, domains: AINodeStore) {
		super(dfg, domains, 'ExprList')
	}
}
