import type { NodeId } from '../../../../src'
import { EmptyArgument } from '../../../../src'
import type {
	DataflowFunctionFlowInformation,
	DataflowGraphVertexUse,
	FunctionArgument,
	REnvironmentInformation
} from '../../../../src/dataflow'
import {
	BuiltIn
	,
	CONSTANT_NAME,
	DataflowGraph,
	EdgeType
} from '../../../../src/dataflow'
import { deepMergeObject } from '../../../../src/util/objects'

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
		exitPoints: readonly NodeId[], subflow: DataflowFunctionFlowInformation,
		info?: { environment?: REnvironmentInformation, controlDependency?: NodeId[] },
		asRoot: boolean = true) {
		return this.addVertex({ tag: 'function-definition', id, name, subflow, exitPoints, controlDependency: info?.controlDependency, environment: info?.environment }, asRoot)
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
		info?: {
			returns?:           readonly NodeId[],
			reads?:             readonly NodeId[],
			onlyBuiltIn?:       boolean,
			environment?:       REnvironmentInformation,
			controlDependency?: NodeId[]
		},
		asRoot: boolean = true) {
		const onlyBuiltInAuto = info?.reads?.length === 1 && info?.reads[0] === BuiltIn
		this.addVertex({ tag: 'function-call', id, name, args, environment: info?.environment, controlDependency: info?.controlDependency, onlyBuiltin: info?.onlyBuiltIn ?? onlyBuiltInAuto ?? false }, asRoot)
		this.addArgumentLinks(id, args)
		if(info?.returns) {
			for(const ret of info.returns) {
				this.returns(id, ret)
			}
		}
		if(info?.reads) {
			for(const call of info.reads) {
				this.reads(id, call)
			}
		}
		return this
	}

	/* automatically adds argument links if they do not already exist */
	private addArgumentLinks(id: NodeId, args: readonly FunctionArgument[]) {
		for(const arg of args) {
			if(arg === EmptyArgument) {
				continue
			}
			if(Array.isArray(arg)) {
				if(arg[1] !== '<value>' && arg[1].name !== undefined && !this.hasVertex(arg[1].nodeId, true)) {
					this.use(arg[1].nodeId, arg[1].name, { controlDependency: arg[1].controlDependency })
					this.argument(id, arg[1].nodeId)
				}
			} else if(arg !== '<value>'&& arg.name !== undefined && !this.hasVertex(arg.nodeId, true)) {
				this.use(arg.nodeId, arg.name, { controlDependency: arg.controlDependency })
				this.argument(id, arg.nodeId)
				if(arg.nodeId.endsWith('-arg')) {
					const withoutSuffix = arg.nodeId.slice(0, -4)
					this.reads(arg.nodeId, withoutSuffix)
				}
			}
		}
	}

	/**
	 * Adds a vertex for an exit point of a function (V3).
	 *
	 * @param id - AST node ID
	 * @param name - AST node text
	 * @param info - Additional/optional properties.
	 * @param asRoot - should the vertex be part of the root vertex set of the graph
	 * (i.e., be a valid entry point), or is it nested (e.g., as part of a function definition)
	 */
	public exit(id: NodeId, name: string,
		info?: { environment?: REnvironmentInformation, controlDependency?: NodeId[] },
		asRoot: boolean = true) {
		return this.addVertex({ tag: 'exit-point', id, environment: info?.environment, name, controlDependency: info?.controlDependency }, asRoot)
	}

	/**
	 * Adds a vertex for a variable definition (V4).
	 *
	 * @param id - AST node ID
	 * @param name - Variable name
	 * @param info - Additional/optional properties.
	 * @param asRoot - Should the vertex be part of the root vertex set of the graph
	 * (i.e., be a valid entry point), or is it nested (e.g., as part of a function definition)
	 */
	public defineVariable(id: NodeId, name: string,
		info?: { controlDependency?: NodeId[], definedBy?: NodeId[]}, asRoot: boolean = true) {
		this.addVertex({ tag: 'variable-definition', id, name, controlDependency: info?.controlDependency }, asRoot)
		if(info?.definedBy) {
			for(const def of info.definedBy) {
				this.definedBy(id, def)
			}
		}
		return this
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
		return this.addVertex(deepMergeObject({ tag: 'use', id, name, controlDependency: undefined, environment: undefined }, info), asRoot)
	}


	/**
	 * Adds a vertex for a constant value (V6).
	 *
	 * @param id - AST node ID
	 * @param options - Additional/optional properties;
	 * @param asRoot - should the vertex be part of the root vertex set of the graph
	 * (i.e., be a valid entry point), or is it nested (e.g., as part of a function definition)
	 */
	public constant(id: NodeId, options?: { controlDependency?: NodeId[] }, asRoot: boolean = true) {
		return this.addVertex({ tag: 'value', name: CONSTANT_NAME, id, controlDependency: options?.controlDependency, environment: undefined }, asRoot)
	}

	/**
	 * Adds a read edge (E1) for simple testing.
	 *
	 * @param from - Vertex/NodeId
	 * @param to   - see from
	 */
	public reads(from: NodeId, to: NodeId | NodeId[]) {
		if(Array.isArray(to)) {
			for(const t of to) {
				this.reads(from, t)
			}
			return this
		}
		return this.addEdge(from, to, { type: EdgeType.Reads })
	}

	/**
	 * Adds a defined-by edge (E2), with from as defined variable, and to
	 * as a variable/function contributing to its definition.
	 *
	 * @see reads for parameters.
	 */
	public definedBy(from: NodeId, to: NodeId | NodeId[]) {
		if(Array.isArray(to)) {
			for(const t of to) {
				this.definedBy(from, t)
			}
			return this
		}
		return this.addEdge(from, to, { type: EdgeType.DefinedBy })
	}

	/**
	 * Adds a same-read-read edge (E3), with from and to as two variable uses
	 * on the same variable.
	 *
	 * @see reads for parameters.
	 */
	public sameRead(from: NodeId, to: NodeId | NodeId[]) {
		if(Array.isArray(to)) {
			for(const t of to) {
				this.sameRead(from, t)
			}
			return this
		}
		return this.addEdge(from, to, { type: EdgeType.SameReadRead })
	}

	/**
	 * Adds a same-def-def edge (E4), with from and to as two variables
	 * that share a defining variable.
	 *
	 * @see reads for parameters.
	 */
	public sameDef(from: NodeId, to: NodeId | NodeId[]) {
		if(Array.isArray(to)) {
			for(const t of to) {
				this.sameDef(from, t)
			}
			return this
		}
		return this.addEdge(from, to, { type: EdgeType.SameDefDef })
	}

	/**
	 * Adds a call edge (E5) with from as caller, and to as callee.
	 *
	 * @see reads for parameters.
	 */
	public calls(from: NodeId, to: NodeId | NodeId[]) {
		if(Array.isArray(to)) {
			for(const t of to) {
				this.calls(from, t)
			}
			return this
		}
		return this.addEdge(from, to, { type: EdgeType.Calls })
	}

	/**
	 * Adds a return edge (E6) with from as function, and to as exit point.
	 *
	 * @see reads for parameters.
	 */
	public returns(from: NodeId, to: NodeId | NodeId[]) {
		if(Array.isArray(to)) {
			for(const t of to) {
				this.returns(from, t)
			}
			return this
		}
		return this.addEdge(from, to, { type: EdgeType.Returns })
	}

	/**
	 * Adds a defines-on-call edge (E7) with from as variable, and to as its definition
	 *
	 * @see reads for parameters.
	 */
	public definesOnCall(from: NodeId, to: NodeId | NodeId[]) {
		if(Array.isArray(to)) {
			for(const t of to) {
				this.definesOnCall(from, t)
			}
			return this
		}
		return this.addEdge(from, to, { type: EdgeType.DefinesOnCall })
	}

	/**
	 * Adds an argument edge (E9) with from as function call, and to as argument.
	 *
	 * @see reads for parameters.
	 */
	public argument(from: NodeId, to: NodeId | NodeId[]) {
		if(Array.isArray(to)) {
			for(const t of to) {
				this.argument(from, t)
			}
			return this
		}
		return this.addEdge(from, to, { type: EdgeType.Argument })
	}

	/**
	 * Adds a relation (E10) with from as exit point, and to as any other vertex.
	 *
	 * @see reads for parameters.
	 */
	public relates(from: NodeId, to: NodeId | NodeId[]) {
		if(Array.isArray(to)) {
			for(const t of to) {
				this.relates(from, t)
			}
			return this
		}
		return this.addEdge(from, to, { type: EdgeType.Relates })
	}
}
