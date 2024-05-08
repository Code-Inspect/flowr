import type { MergeableRecord } from '../../util/objects'
import type { NodeId } from '../../r-bridge'
import type { REnvironmentInformation } from '../environments'
import type { DataflowFunctionFlowInformation, FunctionArgument } from './graph'

export type DataflowGraphVertices<Vertex extends DataflowGraphVertexInfo = DataflowGraphVertexInfo> = Map<NodeId, Vertex>


export const enum VertexType {
	Value = 'value',
	Use = 'use',
	FunctionCall = 'function-call',
	VariableDefinition = 'variable-definition',
	FunctionDefinition = 'function-definition'
}

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
	readonly tag:        VertexType
	/**
	 * The id of the node (the id assigned by the {@link ParentInformation} decoration)
	 */
	id:                  NodeId
	/**
	 * The environment in which the vertex is set.
	 */
	environment?:        REnvironmentInformation | undefined
	/**
	 * See {@link IdentifierReference}
	 */
	controlDependencies: NodeId[] | undefined
}

export interface DataflowGraphValue extends DataflowGraphVertexBase {
	readonly tag:          VertexType.Value
	/* currently without containing the 'real' value as it is part of the normalized AST as well */
	readonly environment?: undefined
}

/**
 * Arguments required to construct a vertex which represents the usage of a variable in the dataflow graph.
 */
export interface DataflowGraphVertexUse extends DataflowGraphVertexBase {
	readonly tag:          VertexType.Use
	readonly environment?: undefined
}

/**
 * Arguments required to construct a vertex which represents the usage of a variable in the dataflow graph.
 */
export interface DataflowGraphVertexFunctionCall extends DataflowGraphVertexBase {
	readonly tag:          VertexType.FunctionCall
	args:                  FunctionArgument[]
	/** a performance flag to indicate that the respective call is _only_ calling a builtin function without any df graph attached */
	onlyBuiltin:           boolean
	readonly environment?: REnvironmentInformation
}

/**
 * Arguments required to construct a vertex which represents the definition of a variable in the dataflow graph.
 */
export interface DataflowGraphVertexVariableDefinition extends DataflowGraphVertexBase {
	readonly tag:          VertexType.VariableDefinition
	readonly environment?: undefined
}

export interface DataflowGraphVertexFunctionDefinition extends DataflowGraphVertexBase {
	readonly tag: VertexType.FunctionDefinition
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

export type DataflowGraphVertexArgument = DataflowGraphVertexUse | DataflowGraphVertexVariableDefinition | DataflowGraphVertexFunctionDefinition | DataflowGraphVertexFunctionCall | DataflowGraphValue
export type DataflowGraphVertexInfo = Required<DataflowGraphVertexArgument>
