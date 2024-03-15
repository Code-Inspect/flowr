import type { MergeableRecord } from '../../util/objects'
import type { NodeId } from '../../r-bridge'
import type { REnvironmentInformation } from '../environments'
import type { DataflowFunctionFlowInformation, FunctionArgument } from './graph'

export type DataflowGraphVertices<Vertex extends DataflowGraphVertexInfo = DataflowGraphVertexInfo> = Map<NodeId, Vertex>

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
	readonly tag:      string
	/**
	 * The id of the node (the id assigned by the {@link ParentInformation} decoration)
	 */
	id:                NodeId
	/**
	 * The name of the node, usually the variable name
	 */
	name:              string
	/**
	 * The environment in which the vertex is set.
	 */
	environment?:      REnvironmentInformation | undefined
	/**
	 * See {@link IdentifierReference}
	 */
	controlDependency: NodeId[] | undefined
}

/**
 * Arguments required to construct a vertex which represents the usage of a variable in the dataflow graph.
 */
export interface DataflowGraphExitPoint extends DataflowGraphVertexBase {
	readonly tag:          'exit-point'
	readonly environment?: REnvironmentInformation
}

export const CONSTANT_NAME = '__@@C@@__'
export interface DataflowGraphValue extends DataflowGraphVertexBase {
	readonly tag:          'value'
	readonly name:         typeof CONSTANT_NAME
	/* currently without containing the 'real' value as it is part of the normalized AST as well */
	readonly environment?: undefined
}

/**
 * Arguments required to construct a vertex which represents the usage of a variable in the dataflow graph.
 */
export interface DataflowGraphVertexUse extends DataflowGraphVertexBase {
	readonly tag:          'use'
	readonly environment?: undefined
}

/**
 * Arguments required to construct a vertex which represents the usage of a variable in the dataflow graph.
 */
export interface DataflowGraphVertexFunctionCall extends DataflowGraphVertexBase {
	readonly tag:          'function-call'
	args:                  FunctionArgument[]
	/** a performance flag to indicate that the respective call is _only_ calling a builtin function without any df graph attached */
	onlyBuiltin:           boolean
	readonly environment?: REnvironmentInformation
}

/**
 * Arguments required to construct a vertex which represents the definition of a variable in the dataflow graph.
 */
export interface DataflowGraphVertexVariableDefinition extends DataflowGraphVertexBase {
	readonly tag:          'variable-definition'
	readonly environment?: undefined
}

export interface DataflowGraphVertexFunctionDefinition extends DataflowGraphVertexBase {
	readonly tag: 'function-definition'
	/**
	 * The static subflow of the function definition, constructed within {@link processFunctionDefinition}.
	 * If the vertex is (for example) a function, it can have a subgraph which is used as a template for each call.
	 */
	subflow:      DataflowFunctionFlowInformation
	/**
	 * All exist points of the function definitions.
	 * In other words: last expressions/return calls
	 */
	exitPoints:   readonly NodeId[]
	environment?: REnvironmentInformation
}

export type DataflowGraphVertexArgument = DataflowGraphVertexUse | DataflowGraphExitPoint | DataflowGraphVertexVariableDefinition | DataflowGraphVertexFunctionDefinition | DataflowGraphVertexFunctionCall | DataflowGraphValue
export type DataflowGraphVertexInfo = Required<DataflowGraphVertexArgument>
