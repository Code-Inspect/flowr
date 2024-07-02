import { type DataflowInformation, ExitPointType } from '../../info'
import type { DataflowProcessorInformation } from '../../processor'
import { processValue } from './process-value'
import type { RSymbol } from '../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import type { ParentInformation } from '../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import { RNa, RNull } from '../../../r-bridge/lang-4.x/convert-values'
import { DataflowGraph } from '../../graph/graph'
import { VertexType } from '../../graph/vertex'

export function processSymbol<OtherInfo>(symbol: RSymbol<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo>): DataflowInformation {
	if(symbol.content === RNull || symbol.content === RNa) {
		return processValue(symbol, data)
	}

	return {
		unknownReferences: [ { nodeId: symbol.info.id, name: symbol.content, controlDependencies: data.controlDependencies } ],
		in:                [],
		out:               [],
		environment:       data.environment,
		graph:             new DataflowGraph(data.completeAst.idMap).addVertex({
			tag:                 VertexType.Use,
			id:                  symbol.info.id,
			controlDependencies: data.controlDependencies
		}),
		entryPoint: symbol.info.id,
		exitPoints: [{ nodeId: symbol.info.id, type: ExitPointType.Default, controlDependencies: data.controlDependencies }]
	}
}
