import { deepMergeObject } from '../../../../src/util/objects'
import type { NodeId } from '../../../../src/r-bridge/lang-4.x/ast/model/processing/node-id'
import { normalizeIdToNumberIfPossible } from '../../../../src/r-bridge/lang-4.x/ast/model/processing/node-id'
import type { AstIdMap } from '../../../../src/r-bridge/lang-4.x/ast/model/processing/decorate'
import type { DataflowFunctionFlowInformation, FunctionArgument } from '../../../../src/dataflow/graph/graph'
import { isPositionalArgument, DataflowGraph } from '../../../../src/dataflow/graph/graph'
import type { REnvironmentInformation } from '../../../../src/dataflow/environments/environment'
import { initializeCleanEnvironments } from '../../../../src/dataflow/environments/environment'
import type { DataflowGraphVertexUse } from '../../../../src/dataflow/graph/vertex'
import { VertexType } from '../../../../src/dataflow/graph/vertex'
import { EmptyArgument } from '../../../../src/r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import { BuiltIn } from '../../../../src/dataflow/environments/built-in'
import { EdgeType } from '../../../../src/dataflow/graph/edge'
import type { ControlDependency } from '../../../../src/dataflow/info'

export function emptyGraph(idMap?: AstIdMap) {
	return new DataflowGraphBuilder(idMap)
}

export type DataflowGraphEdgeTarget = NodeId | (readonly NodeId[]);

/**
 * This DataflowGraphBuilder extends {@link DataflowGraph} with builder methods to
 * easily and compactly add vertices and edges to a dataflow graph. Its usage thus
 * simplifies writing tests for dataflow graphs.
 */
export class DataflowGraphBuilder extends DataflowGraph {
	/**
	 * Adds a **vertex** for a **function definition** (V1).
	 *
	 * @param id - AST node ID
	 * @param subflow - Subflow data graph for the defined function.
	 * @param exitPoints - Node IDs for exit point vertices.
	 * @param info - Additional/optional properties.
	 * @param asRoot - should the vertex be part of the root vertex set of the graph
	 * (i.e., be a valid entry point), or is it nested (e.g., as part of a function definition)
	 */
	public defineFunction(id: NodeId,
		exitPoints: readonly NodeId[], subflow: DataflowFunctionFlowInformation,
		info?: { environment?: REnvironmentInformation, controlDependencies?: ControlDependency[] },
		asRoot: boolean = true) {
		return this.addVertex({
			tag:     VertexType.FunctionDefinition,
			id:      normalizeIdToNumberIfPossible(id),
			subflow: {
				...subflow,
				entryPoint:        normalizeIdToNumberIfPossible(subflow.entryPoint),
				graph:             new Set([...subflow.graph].map(normalizeIdToNumberIfPossible)),
				out:               subflow.out.map(o => ({ ...o, nodeId: normalizeIdToNumberIfPossible(o.nodeId), controlDependencies: o.controlDependencies?.map(c => ({ ...c, id: normalizeIdToNumberIfPossible(c.id) })) })),
				in:                subflow.in.map(o => ({ ...o, nodeId: normalizeIdToNumberIfPossible(o.nodeId), controlDependencies: o.controlDependencies?.map(c => ({ ...c, id: normalizeIdToNumberIfPossible(c.id) })) })),
				unknownReferences: subflow.unknownReferences.map(o => ({ ...o, nodeId: normalizeIdToNumberIfPossible(o.nodeId), controlDependencies: o.controlDependencies?.map(c => ({ ...c, id: normalizeIdToNumberIfPossible(c.id) })) }))
			} as DataflowFunctionFlowInformation,
			exitPoints:          exitPoints.map(normalizeIdToNumberIfPossible),
			controlDependencies: info?.controlDependencies?.map(c => ({ ...c, id: normalizeIdToNumberIfPossible(c.id) })),
			environment:         info?.environment
		}, asRoot)
	}

	/**
	 * Adds a **vertex** for a **function call** (V2).
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
			returns?:             readonly NodeId[],
			reads?:               readonly NodeId[],
			onlyBuiltIn?:         boolean,
			environment?:         REnvironmentInformation,
			controlDependencies?: ControlDependency[]
		},
		asRoot: boolean = true) {
		const onlyBuiltInAuto = info?.reads?.length === 1 && info?.reads[0] === BuiltIn
		this.addVertex({
			tag:                 VertexType.FunctionCall,
			id:                  normalizeIdToNumberIfPossible(id),
			name,
			args:                args.map(a => a === EmptyArgument ? EmptyArgument : { ...a, nodeId: normalizeIdToNumberIfPossible(a.nodeId), controlDependencies: undefined }),
			environment:         (info?.onlyBuiltIn || onlyBuiltInAuto) ? undefined : info?.environment ?? initializeCleanEnvironments(),
			controlDependencies: info?.controlDependencies?.map(c => ({ ...c, id: normalizeIdToNumberIfPossible(c.id) })),
			onlyBuiltin:         info?.onlyBuiltIn ?? onlyBuiltInAuto ?? false
		}, asRoot)
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

	/** automatically adds argument links if they do not already exist */
	private addArgumentLinks(id: NodeId, args: readonly FunctionArgument[]) {
		for(const arg of args) {
			if(arg === EmptyArgument) {
				continue
			}
			if(isPositionalArgument(arg)) {
				this.argument(id, arg.nodeId)
				if(typeof arg.nodeId === 'string' && arg.nodeId.endsWith('-arg')) {
					const withoutSuffix = arg.nodeId.slice(0, -4)
					this.reads(arg.nodeId, withoutSuffix)
				}
			} else if(!this.hasVertex(arg.nodeId, true)) {
				this.use(arg.nodeId, arg.name, { controlDependencies: arg.controlDependencies })
				this.argument(id, arg.nodeId)
			}
		}
	}

	/**
	 * Adds a **vertex** for a **variable definition** (V4).
	 *
	 * @param id - AST node ID
	 * @param name - Variable name
	 * @param info - Additional/optional properties.
	 * @param asRoot - Should the vertex be part of the root vertex set of the graph
	 * (i.e., be a valid entry point), or is it nested (e.g., as part of a function definition)
	 */
	public defineVariable(id: NodeId, name?: string,
		info?: { controlDependencies?: ControlDependency[], definedBy?: NodeId[]}, asRoot: boolean = true) {
		this.addVertex({
			tag:                 VertexType.VariableDefinition,
			id:                  normalizeIdToNumberIfPossible(id),
			name,
			controlDependencies: info?.controlDependencies?.map(c => ({ ...c, id: normalizeIdToNumberIfPossible(c.id) })),
		}, asRoot)
		if(info?.definedBy) {
			for(const def of info.definedBy) {
				this.definedBy(id, def)
			}
		}
		return this
	}

	/**
	 * Adds a **vertex** for **variable use** (V5). Intended for creating dataflow graphs as part of function tests.
	 *
	 * @param id - AST node id
	 * @param name - Variable name
	 * @param info - Additional/optional properties; i.e., scope, when, or environment.
	 * @param asRoot - should the vertex be part of the root vertex set of the graph
	 * (i.e., be a valid entry point) or is it nested (e.g., as part of a function definition)
	 */
	public use(id: NodeId, name?: string, info?: Partial<DataflowGraphVertexUse>, asRoot: boolean = true) {
		return this.addVertex(deepMergeObject({
			tag:                 VertexType.Use,
			id:                  normalizeIdToNumberIfPossible(id),
			name,
			controlDependencies: undefined,
			environment:         undefined
		}, {
			...info,
			controlDependencies: info?.controlDependencies?.map(c => ({ ...c, id: normalizeIdToNumberIfPossible(c.id) }))
		} as Partial<DataflowGraphVertexUse>), asRoot)
	}


	/**
	 * Adds a **vertex** for a **constant value** (V6).
	 *
	 * @param id - AST node ID
	 * @param options - Additional/optional properties;
	 * @param asRoot - should the vertex be part of the root vertex set of the graph
	 * (i.e., be a valid entry point), or is it nested (e.g., as part of a function definition)
	 */
	public constant(id: NodeId, options?: { controlDependencies?: ControlDependency[] }, asRoot: boolean = true) {
		return this.addVertex({
			tag:                 VertexType.Value,
			id:                  normalizeIdToNumberIfPossible(id),
			controlDependencies: options?.controlDependencies?.map(c => ({ ...c, id: normalizeIdToNumberIfPossible(c.id) })),
			environment:         undefined
		}, asRoot)
	}

	private edgeHelper(from: NodeId, to: DataflowGraphEdgeTarget, type: EdgeType) {
		if(Array.isArray(to)) {
			for(const t of to) {
				this.edgeHelper(from, t as NodeId, type)
			}
			return this
		}
		return this.addEdge(normalizeIdToNumberIfPossible(from), normalizeIdToNumberIfPossible(to as NodeId), { type })
	}

	/**
	 * Adds a **read edge** (E1).
	 *
	 * @param from - Vertex/NodeId
	 * @param to   - see from
	 */
	public reads(from: NodeId, to: DataflowGraphEdgeTarget) {
		return this.edgeHelper(from, to, EdgeType.Reads)
	}

	/**
	 * Adds a **defined-by edge** (E2), with from as defined variable, and to
	 * as a variable/function contributing to its definition.
	 *
	 * @see reads for parameters.
	 */
	public definedBy(from: NodeId, to: DataflowGraphEdgeTarget) {
		return this.edgeHelper(from, to, EdgeType.DefinedBy)
	}

	/**
	 * Adds a **call edge** (E5) with from as caller, and to as callee.
	 *
	 * @see reads for parameters.
	 */
	public calls(from: NodeId, to: DataflowGraphEdgeTarget) {
		return this.edgeHelper(from, to, EdgeType.Calls)
	}

	/**
	 * Adds a **return edge** (E6) with from as function, and to as exit point.
	 *
	 * @see reads for parameters.
	 */
	public returns(from: NodeId, to: DataflowGraphEdgeTarget) {
		return this.edgeHelper(from, to, EdgeType.Returns)
	}

	/**
	 * Adds a **defines-on-call edge** (E7) with from as variable, and to as its definition
	 *
	 * @see reads for parameters.
	 */
	public definesOnCall(from: NodeId, to: DataflowGraphEdgeTarget) {
		return this.edgeHelper(from, to, EdgeType.DefinesOnCall)
	}

	/**
	 * Adds an **argument edge** (E9) with from as function call, and to as argument.
	 *
	 * @see reads for parameters.
	 */
	public argument(from: NodeId, to: DataflowGraphEdgeTarget) {
		return this.edgeHelper(from, to, EdgeType.Argument)
	}

	/**
	 * Adds a **non-standard evaluation edge** with from as vertex, and to as vertex.
	 *
	 * @see reads for parameters.
	 */
	public nse(from: NodeId, to: DataflowGraphEdgeTarget) {
		return this.edgeHelper(from, to, EdgeType.NonStandardEvaluation)
	}

	/**
	 * Adds a **side-effect-on-call edge** with from as vertex, and to as vertex.
	 *
	 * @see reads for parameters.
	 */
	public sideEffectOnCall(from: NodeId, to: DataflowGraphEdgeTarget) {
		return this.edgeHelper(from, to, EdgeType.SideEffectOnCall)
	}
}
