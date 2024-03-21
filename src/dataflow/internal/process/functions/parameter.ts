import type { DataflowInformation } from '../../info'
import type { DataflowProcessorInformation } from '../../../processor'
import { processDataflowFor } from '../../../processor'
import type { IdentifierDefinition } from '../../../environments'
import { define } from '../../../environments'
import type { ParentInformation, RParameter } from '../../../../r-bridge'
import { RType } from '../../../../r-bridge'
import { log } from '../../../../util/log'
import { EdgeType } from '../../../graph'
import { LocalScope } from '../../../environments/scopes'

export function processFunctionParameter<OtherInfo>(parameter: RParameter<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo & ParentInformation>): DataflowInformation {
	const name = processDataflowFor(parameter.name, data)
	const defaultValue = parameter.defaultValue === undefined ? undefined : processDataflowFor(parameter.defaultValue, data)
	const graph = defaultValue !== undefined ? name.graph.mergeWith(defaultValue.graph) : name.graph

	const writtenNodes: IdentifierDefinition[] = name.unknownReferences.map(n => ({
		...n,
		kind:      'parameter',
		used:      'always',
		definedAt: parameter.info.id,
		scope:     LocalScope
	}))

	let environments = name.environments
	for(const writtenNode of writtenNodes) {
		log.trace(`parameter ${writtenNode.name} (${writtenNode.nodeId}) is defined at id ${writtenNode.definedAt} with ${defaultValue === undefined ? 'no default value' : ' no default value'}`)
		graph.setDefinitionOfVertex(writtenNode)
		environments = define(writtenNode, LocalScope, environments)

		if(defaultValue !== undefined) {
			if(parameter.defaultValue?.type === RType.FunctionDefinition) {
				graph.addEdge(writtenNode, parameter.defaultValue.info.id, EdgeType.DefinedBy, 'maybe' /* default arguments can be overridden! */)
			} else {
				const definedBy = [...defaultValue.in, ...defaultValue.unknownReferences]
				for(const node of definedBy) {
					graph.addEdge(writtenNode, node, EdgeType.DefinedBy, 'maybe' /* default arguments can be overridden! */)
				}
			}
		}
	}

	return {
		unknownReferences: [],
		in:                defaultValue === undefined ? [] : [...defaultValue.in, ...defaultValue.unknownReferences, ...name.in],
		out:               [...(defaultValue?.out ?? []), ...name.out, ...name.unknownReferences],
		graph:             graph,
		environments:      environments,
		scope:             data.activeScope
	}
}
