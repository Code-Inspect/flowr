import { type DataflowInformation, ExitPointType } from '../../info'
import type { DataflowProcessorInformation } from '../../processor'
import { processValue } from './process-value'
import type { RSymbol } from '../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import type { ParentInformation } from '../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import { RNa, RNull } from '../../../r-bridge/lang-4.x/convert-values'
import { DataflowGraph } from '../../graph/graph'
import { VertexType } from '../../graph/vertex'
import { AiInfo, unifyDomains } from '../../../abstract-interpretation/domain'
import type { InGraphIdentifierDefinition } from '../../environments/identifier'

export function processSymbol<OtherInfo>(symbol: RSymbol<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo>): DataflowInformation {
	if(symbol.content === RNull || symbol.content === RNa) {
		return processValue(symbol, data)
	}

	const aiInfos = data.environment.current.memory.get(symbol.content)
		?.filter(id => id.kind === 'function' || id.kind === 'variable' || id.kind === 'parameter' || id.kind === 'argument')
		.map(id => (id as InGraphIdentifierDefinition).aiInfo)
		.filter(aiInfo => aiInfo !== undefined)
		.map(aiInfo => aiInfo as AiInfo)

	//FIXME: aggregate AiInfos (especially narrowings)
	const domain = aiInfos && unifyDomains(aiInfos.map(info => info.domain))
	const narrowings = aiInfos && aiInfos.map(info => info.narrowings).flat()

	return {
		unknownReferences: [ { nodeId: symbol.info.id, name: symbol.content, controlDependencies: data.controlDependencies } ],
		in:                [],
		out:               [],
		environment:       data.environment,
		graph:             new DataflowGraph(data.completeAst.idMap).addVertex({
			tag: VertexType.Use,
			id:  symbol.info.id,
			controlDependencies:
			data.controlDependencies,
			domain: domain
		}),
		entryPoint: symbol.info.id,
		exitPoints: [{ nodeId: symbol.info.id, type: ExitPointType.Default, controlDependencies: data.controlDependencies }],
		aiInfo:     domain && narrowings && new AiInfo(symbol.content, domain, narrowings)
	}
}
