import type { DataflowInformation } from '../../../info'
import type { DataflowProcessorInformation } from '../../../processor'
import { processDataflowFor } from '../../../processor'
import type { IdentifierDefinition } from '../../../environments'
import { define } from '../../../environments'
import type { ParentInformation, RParameter } from '../../../../r-bridge'
import { RType } from '../../../../r-bridge'
import { log } from '../../../../util/log'
import { EdgeType } from '../../../graph'

export function processFunctionParameter<OtherInfo>(parameter: RParameter<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo & ParentInformation>): DataflowInformation {
	const name = processDataflowFor(parameter.name, data)
	const defaultValue = parameter.defaultValue === undefined ? undefined : processDataflowFor(parameter.defaultValue, data)
	const graph = defaultValue !== undefined ? name.graph.mergeWith(defaultValue.graph) : name.graph

	const writtenNodes: IdentifierDefinition[] = name.unknownReferences.map(n => ({
		...n,
		kind:      'parameter',
		definedAt: parameter.info.id
	}))

	let environment = name.environment
	for(const writtenNode of writtenNodes) {
		log.trace(`parameter ${writtenNode.name} (${writtenNode.nodeId}) is defined at id ${writtenNode.definedAt} with ${defaultValue === undefined ? 'no default value' : ' no default value'}`)
		graph.setDefinitionOfVertex(writtenNode)
		environment = define(writtenNode, false, environment)

		if(defaultValue !== undefined) {
			if(parameter.defaultValue?.type === RType.FunctionDefinition) {
				graph.addEdge(writtenNode, parameter.defaultValue.info.id, { type: EdgeType.DefinedBy })
			} else {
				const definedBy = [...defaultValue.in, ...defaultValue.unknownReferences]
				for(const node of definedBy) {
					graph.addEdge(writtenNode, node, { type: EdgeType.DefinedBy })
				}
			}
		}
	}

	return {
		unknownReferences: [],
		in:                defaultValue === undefined ? [] : [...defaultValue.in, ...defaultValue.unknownReferences, ...name.in],
		out:               [...(defaultValue?.out ?? []), ...name.out, ...name.unknownReferences],
		graph:             graph,
		environment:       environment,
		entryPoint:        parameter.info.id,
		returns:           [],
		breaks:            [],
		nexts:             []
	}
}
