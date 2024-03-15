import { DataflowGraph } from './graph'
import type { REnvironmentInformation, IdentifierReference } from './environments'
import type { DataflowProcessorInformation } from './processor'
import type { NodeId } from '../r-bridge'

/**
 * Continuously updated during the dataflow analysis to hold the current state.
 */
export interface DataflowInformation {
	/** References that have not been identified as read or write and will be so on higher */
	unknownReferences: readonly IdentifierReference[]
	/** References which are read */
	in:                readonly IdentifierReference[]
	/** References which are written to */
	out:               readonly IdentifierReference[]
	/** all vertices which trigger an active 'return' in the current dataflow graph */
	returns:           readonly NodeId[],
	/** all vertices which trigger an active 'break' in the current dataflow graph */
	breaks:            readonly NodeId[],
	/** all vertices which trigger an active 'next' in the current dataflow graph */
	nexts:             readonly NodeId[],
	/** intended to construct a hammock graph this represents the current entry into the graph, with undefined exit points representing a block that should not be part of the CFG (like a comment) */
	entryPoint:        NodeId | undefined,
	/** Current environments used for name resolution, probably updated on the next expression-list processing */
	environment:       REnvironmentInformation
	/** The current constructed dataflow graph */
	graph:             DataflowGraph
}

export function initializeCleanDataflowInformation<T>(data: Pick<DataflowProcessorInformation<T>, 'environment'>): DataflowInformation {
	return {
		unknownReferences: [],
		in:                [],
		out:               [],
		returns:           [],
		breaks:            [],
		nexts:             [],
		entryPoint:        undefined,
		environment:       data.environment,
		graph:             new DataflowGraph()
	}
}
