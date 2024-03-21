import type { DataflowFunctionFlowInformation, DataflowGraphEdgeAttribute, DataflowGraphExitPoint, DataflowGraphVertexFunctionCall, DataflowGraphVertexFunctionDefinition, DataflowGraphVertexUse, DataflowGraphVertexVariableDefinition, FunctionArgument, NodeId, REnvironmentInformation } from '../../../src'
import { DataflowGraph, EdgeType } from '../../../src'
import { LocalScope } from '../../../src/dataflow/environments/scopes'
import { deepMergeObject } from '../../../src/util/objects'

export function emptyGraph() {
	return new DataflowGraphBuilder()
}

/**
 * This DataflowGraphBuilder extends {@link DataflowGraph} with builder methods to
 * easily and compactly add vertices and edges to a dataflow graph. Its usage thus
 * simplifies writing tests for dataflows.
 */
export class DataflowGraphBuilder extends DataflowGraph {
	/**
	 * Adds a vertex for a function definition (V1).
	 * 
	 * @param id - AST node ID
	 * @param name - AST node text
	 * @param subflow - Subflow data graph for the defined function.
	 * @param exitPoints - Node IDs for exit point vertices.
	 * @param info - Additional/optional properties.
	 * @param asRoot - should the vertex be part of the root vertex set of the graph
	 * (i.e., be a valid entry point), or is it nested (e.g., as part of a function definition)
	 */
	public defineFunction(id: NodeId, name: string, 
		exitPoints: NodeId[], subflow: DataflowFunctionFlowInformation,
		info?: Partial<DataflowGraphVertexFunctionDefinition>,
		asRoot: boolean = true) {
		const scope = (info && info.scope) ? info.scope : LocalScope
		return this.addVertex(deepMergeObject({ tag: 'function-definition', id, name, subflow, exitPoints, scope }, info), asRoot)
	}

	/**
	 * Adds a vertex for a function call (V2).
	 * 
	 * @param id - AST node ID
	 * @param name - Function name
	 * @param args - Function arguments; may be empty
	 * @param info - Additional/optional properties.
	 * @param asRoot - should the vertex be part of the root vertex set of the graph
	 * (i.e., be a valid entry point), or is it nested (e.g., as part of a function definition)
	 */
	public call(id: NodeId, name: string, args: FunctionArgument[],
		info?: Partial<DataflowGraphVertexFunctionCall>,
		asRoot: boolean = true) {
		return this.addVertex(deepMergeObject({ tag: 'function-call', id, name, args }, info), asRoot)
	}

	/**
	 * Adds a vertex for an exit point of a function (V3).
	 * 
	 * @param id - AST node ID
	 * @param name - AST node text
	 * @param env - Environment of the function we exit.
	 * @param info - Additional/optional properties.
	 * @param asRoot - should the vertex be part of the root vertex set of the graph
	 * (i.e., be a valid entry point), or is it nested (e.g., as part of a function definition)
	 */
	public exit(id: NodeId, name: string, environment?: REnvironmentInformation,
		info?: Partial<DataflowGraphExitPoint>,
		asRoot: boolean = true) {
		return this.addVertex(deepMergeObject({ tag: 'exit-point', id, environment, name }, info), asRoot)
	}

	/**
	 * Adds a vertex for a variable definition (V4).
	 * 
	 * @param id - AST node ID
	 * @param name - Variable name
	 * @param scope - Scope (global/local/custom), defaults to local.
	 * @param info - Additional/optional properties.
	 * @param asRoot - should the vertex be part of the root vertex set of the graph
	 * (i.e., be a valid entry point), or is it nested (e.g., as part of a function definition)
	 */
	public defineVariable(id: NodeId, name: string, scope: string = LocalScope,
		info?: Partial<DataflowGraphVertexVariableDefinition>, asRoot: boolean = true) {
		return this.addVertex(deepMergeObject({ tag: 'variable-definition', id, name, scope }, info), asRoot)
	}    
	
	/**
	 * Adds a vertex for variable use (V5). Intended for creating dataflow graphs as part of function tests.
	 * 
	 * @param id - AST node id
	 * @param name - Variable name
	 * @param info - Additional/optional properties;
	 * i.e. scope, when, or environment.
	 * @param asRoot - should the vertex be part of the root vertex set of the graph
	 * (i.e., be a valid entry point) or is it nested (e.g., as part of a function definition)
	 */
	public use(id: NodeId, name: string, info?: Partial<DataflowGraphVertexUse>, asRoot: boolean = true) {
		return this.addVertex(deepMergeObject({ tag: 'use', id, name }, info), asRoot)
	}

	/**
	 * Adds a read edge (E1) for simple testing.
	 * 
	 * @param from - Vertex/NodeId
	 * @param to   - see from
	 * @param when - always (default), or maybe
	 */
	public reads(from: NodeId, to: NodeId, when: DataflowGraphEdgeAttribute = 'always') {
		return this.addEdge(from, to, EdgeType.Reads, when)
	}

	/**
	 * Adds a defined-by edge (E2), with from as defined variable, and to as
	 * as a variable/function contributing to its definition.
	 * 
	 * @see reads for parameters.
	 */
	public definedBy(from: NodeId, to: NodeId, when: DataflowGraphEdgeAttribute = 'always') {
		return this.addEdge(from, to, EdgeType.DefinedBy, when)
	}

	/**
	 * Adds a same-read-read edge (E3), with from and to as two variable uses
	 * on the same variable.
	 * 
	 * @see reads for parameters.
	 */
	public sameRead(from: NodeId, to: NodeId, when: DataflowGraphEdgeAttribute = 'always') {
		return this.addEdge(from, to, EdgeType.SameReadRead, when)
	}

	/**
	 * Adds a same-def-def edge (E4), with from and to as two variables
	 * that share a defining variable.
	 * 
	 * @see reads for parameters.
	 */
	public sameDef(from: NodeId, to: NodeId, when: DataflowGraphEdgeAttribute = 'always') {
		return this.addEdge(from, to, EdgeType.SameDefDef, when)
	}

	/**
	 * Adds a call edge (E5) with from as caller, and to as callee.
	 * 
	 * @see reads for parameters.
	 */
	public calls(from: NodeId, to: NodeId, when: DataflowGraphEdgeAttribute = 'always') {
		return this.addEdge(from, to, EdgeType.Calls, when)
	}

	/**
	 * Adds a return edge (E6) with from as function, and to as exit point.
	 * 
	 * @see reads for parameters.
	 */
	public returns(from: NodeId, to: NodeId, when: DataflowGraphEdgeAttribute = 'always') {
		return this.addEdge(from, to, EdgeType.Returns, when)
	}

	/**
	 * Adds a defines-on-call edge (E7) with from as variable, and to as its definition
	 * 
	 * @see reads for parameters.
	 */
	public definesOnCall(from: NodeId, to: NodeId, when: DataflowGraphEdgeAttribute = 'always') {
		return this.addEdge(from, to, EdgeType.DefinesOnCall, when)
	}

	/**
	 * Adds an argument edge (E9) with from as function call, and to as argument.
	 *
	 * @see reads for parameters.
	 */
	public argument(from: NodeId, to: NodeId, when: DataflowGraphEdgeAttribute = 'always') {
		return this.addEdge(from, to, EdgeType.Argument, when)
	}

	/**
	 * Adds an relation (E10) with from as exit point, and to as any other vertex.
	 *
	 * @see reads for parameters.
	 */
	public relates(from: NodeId, to: NodeId, when: DataflowGraphEdgeAttribute = 'always') {
		return this.addEdge(from, to, EdgeType.Relates, when)
	}
}