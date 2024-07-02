import { type DataflowInformation, ExitPointType } from '../../info'
import type { DataflowProcessorInformation } from '../../processor'
import type { RNodeWithParent } from '../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import { DataflowGraph } from '../../graph/graph'
import { VertexType } from '../../graph/vertex'

export function processValue<OtherInfo>(value: RNodeWithParent, data: DataflowProcessorInformation<OtherInfo>): DataflowInformation {
	return {
		unknownReferences: [],
		in:                [{ nodeId: value.info.id, name: undefined, controlDependencies: data.controlDependencies }],
		out:               [],
		environment:       data.environment,
		graph:             new DataflowGraph(data.completeAst.idMap).addVertex({
			tag:                 VertexType.Value,
			id:                  value.info.id,
			controlDependencies: data.controlDependencies
		}),
		exitPoints: [{ nodeId: value.info.id, type: ExitPointType.Default, controlDependencies: data.controlDependencies }],
		entryPoint: value.info.id
	}
}
