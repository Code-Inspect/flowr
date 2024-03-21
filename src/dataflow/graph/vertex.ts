import type { MergeableRecord } from '../../util/objects'
import type { NodeId } from '../../r-bridge'
import type { DataflowScopeName, REnvironmentInformation } from '../environments'
import type { DataflowGraphEdgeAttribute } from './edge'
import type { DataflowFunctionFlowInformation, FunctionArgument } from './graph'

export type DataflowGraphVertices = Map<NodeId, DataflowGraphVertexInfo>

/**
 * Arguments required to construct a vertex in the dataflow graph.
 *
 * @see DataflowGraphVertexUse
 * @see DataflowGraphVertexVariableDefinition
 * @see DataflowGraphVertexFunctionDefinition
 */
interface DataflowGraphVertexBase extends MergeableRecord {
	/**
	 * Used to identify and separate different types of vertices.
	 */
	readonly tag: string
	/**
	 * The id of the node (the id assigned by the {@link ParentInformation} decoration)
	 */
	id:           NodeId
	/**
	 * The name of the node, usually the variable name
	 */
	name:         string
	/**
	 * The environment in which the node is defined.
	 * If you do not provide an explicit environment, this will use the same clean one (with {@link initializeCleanEnvironments}).
	 */
	environment?: REnvironmentInformation
	/**
	 * Is this node part of every local execution trace or only in some.
	 * If you do not provide an explicit value, this will default to `always`.
	 */
	when?:        DataflowGraphEdgeAttribute
}

/**
 * Arguments required to construct a vertex which represents the usage of a variable in the dataflow graph.
 */
export interface DataflowGraphExitPoint extends DataflowGraphVertexBase {
	readonly tag: 'exit-point'
}

/**
 * Arguments required to construct a vertex which represents the usage of a variable in the dataflow graph.
 */
export interface DataflowGraphVertexUse extends DataflowGraphVertexBase {
	readonly tag: 'use'
}

/**
 * Arguments required to construct a vertex which represents the usage of a variable in the dataflow graph.
 */
export interface DataflowGraphVertexFunctionCall extends DataflowGraphVertexBase {
	readonly tag: 'function-call'
	args:         FunctionArgument[]
}

/**
 * Arguments required to construct a vertex which represents the definition of a variable in the dataflow graph.
 */
export interface DataflowGraphVertexVariableDefinition extends DataflowGraphVertexBase {
	readonly tag: 'variable-definition'
	/**
	 * The scope in which the vertex is defined (can be global or local to the current environment).
	 */
	scope:        DataflowScopeName
}

export interface DataflowGraphVertexFunctionDefinition extends DataflowGraphVertexBase {
	readonly tag: 'function-definition'
	/**
	 * The scope in which the vertex is defined (can be global or local to the current environment).
	 */
	scope:        DataflowScopeName
	/**
	 * The static subflow of the function definition, constructed within {@link processFunctionDefinition}.
	 * If the vertex is (for example) a function, it can have a subgraph which is used as a template for each call.
	 */
	subflow:      DataflowFunctionFlowInformation
	/**
	 * All exist points of the function definitions.
	 * In other words: last expressions/return calls
	 */
	exitPoints:   NodeId[]
}

export type DataflowGraphVertexArgument = DataflowGraphVertexUse | DataflowGraphExitPoint | DataflowGraphVertexVariableDefinition | DataflowGraphVertexFunctionDefinition | DataflowGraphVertexFunctionCall
export type DataflowGraphVertexInfo = Required<DataflowGraphVertexArgument>
