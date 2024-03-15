import type { ParentInformation, RSymbol } from '../../../r-bridge'
import { RNa, RNull } from '../../../r-bridge'
import { DataflowGraph } from '../../graph'
import { type DataflowInformation } from '../../info'
import type { DataflowProcessorInformation } from '../../processor'
import { processValue } from './process-value'

export function processSymbol<OtherInfo>(symbol: RSymbol<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo>): DataflowInformation {
	if(symbol.content === RNull || symbol.content === RNa) {
		return processValue(symbol, data)
	}

	return {
		unknownReferences: [ { nodeId: symbol.info.id, name: symbol.content, controlDependency: data.controlDependency } ],
		in:                [],
		out:               [],
		environment:       data.environment,
		graph:             new DataflowGraph().addVertex({ tag: 'use', id: symbol.info.id, name: symbol.content, controlDependency: data.controlDependency }),
		returns:           [],
		breaks:            [],
		nexts:             [],
		entryPoint:        symbol.info.id
	}
}
