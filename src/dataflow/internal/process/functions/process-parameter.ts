import type { DataflowInformation } from '../../../info'
import { ExitPointType } from '../../../info'
import type { DataflowProcessorInformation } from '../../../processor'
import { processDataflowFor } from '../../../processor'
import { log } from '../../../../util/log'
import type { RParameter } from '../../../../r-bridge/lang-4.x/ast/model/nodes/r-parameter'
import type { ParentInformation } from '../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { IdentifierDefinition } from '../../../environments/identifier'
import { define } from '../../../environments/define'
import { RType } from '../../../../r-bridge/lang-4.x/ast/model/type'
import { EdgeType } from '../../../graph/edge'

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
		exitPoints:        [{ nodeId: parameter.info.id, type: ExitPointType.Default, controlDependencies: data.controlDependencies }]
	}
}
