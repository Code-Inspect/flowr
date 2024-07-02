import { guard } from '../../util/assert'
import type { DataflowGraphEdge } from './edge'
import { EdgeType } from './edge'

import type { DataflowInformation } from '../info'
import type { DataflowDifferenceReport } from './diff'
import { diffOfDataflowGraphs, equalFunctionArguments } from './diff'
import type {
	DataflowGraphVertexArgument,
	DataflowGraphVertexFunctionCall,
	DataflowGraphVertexFunctionDefinition,
	DataflowGraphVertexInfo,
	DataflowGraphVertices } from './vertex'
import {
	VertexType
} from './vertex'
import { arrayEqual } from '../../util/arrays'
import { EmptyArgument } from '../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { IdentifierDefinition, IdentifierReference } from '../environments/identifier'
import type { NodeId } from '../../r-bridge/lang-4.x/ast/model/processing/node-id'
import type { REnvironmentInformation } from '../environments/environment'
import { initializeCleanEnvironments } from '../environments/environment'
import type { AstIdMap } from '../../r-bridge/lang-4.x/ast/model/processing/decorate'
import { cloneEnvironmentInformation } from '../environments/clone'
import { BuiltIn } from '../environments/built-in'

export type DataflowFunctionFlowInformation = Omit<DataflowInformation, 'graph' | 'exitPoints'>  & { graph: Set<NodeId> }

export interface NamedFunctionArgument extends IdentifierReference {
	readonly name: string
}
export interface PositionalFunctionArgument extends Omit<IdentifierReference, 'name'> {
	readonly name?: undefined
}
export type FunctionArgument = NamedFunctionArgument | PositionalFunctionArgument | typeof EmptyArgument

export function isPositionalArgument(arg: FunctionArgument): arg is PositionalFunctionArgument {
	return arg !== EmptyArgument && arg.name === undefined
}

export function isNamedArgument(arg: FunctionArgument): arg is NamedFunctionArgument {
	return arg !== EmptyArgument && arg.name !== undefined
}

export function getReferenceOfArgument(arg: FunctionArgument): NodeId | undefined {
	if(arg !== EmptyArgument) {
		return arg.nodeId
	}
	return undefined
}

type ReferenceForEdge = Pick<IdentifierReference, 'nodeId' | 'controlDependencies'>  | IdentifierDefinition


/**
 * Maps the edges target to the edge information
 */
export type OutgoingEdges<Edge extends DataflowGraphEdge = DataflowGraphEdge> = Map<NodeId, Edge>
/**
 * Similar to {@link OutgoingEdges}, but inverted regarding the edge direction.
 * In other words, it maps the source to the edge information.
 */
export type IngoingEdges<Edge extends DataflowGraphEdge = DataflowGraphEdge> = Map<NodeId, Edge>


function extractEdgeIds(from: NodeId | ReferenceForEdge, to: NodeId | ReferenceForEdge): { fromId: NodeId, toId: NodeId } {
	const fromId = typeof from === 'object' ? from.nodeId : from
	const toId = typeof to === 'object' ? to.nodeId : to
	return { fromId, toId }
}

type EdgeData<Edge extends DataflowGraphEdge> = Omit<Edge, 'from' | 'to' | 'types' | 'attribute'> & { type: EdgeType }

/**
 * The dataflow graph holds the dataflow information found within the given AST.
 * We differentiate the directed edges in {@link EdgeType} and the vertices indicated by {@link DataflowGraphVertexArgument}
 *
 * The vertices of the graph are organized in a hierarchical fashion, with a function-definition node containing the node ids of its subgraph.
 * However, all *edges* are hoisted at the top level in the form of an (attributed) adjacency list.
 * After the dataflow analysis, all sources and targets of the edges *must* be part of the vertices.
 * However, this does not have to hold during the construction as edges may point from or to vertices which are yet to be constructed.
 *
 * All methods return the modified graph to allow for chaining.
 */
export class DataflowGraph<Vertex extends DataflowGraphVertexInfo = DataflowGraphVertexInfo, Edge extends DataflowGraphEdge = DataflowGraphEdge> {
	private static DEFAULT_ENVIRONMENT: REnvironmentInformation | undefined = undefined
	private _idMap:                     AstIdMap | undefined
	// this should be linked separately
	public readonly functionCache = new Map<NodeId, Set<DataflowGraphVertexInfo>>()

	constructor(idMap: AstIdMap | undefined) {
		DataflowGraph.DEFAULT_ENVIRONMENT ??= initializeCleanEnvironments()
		this._idMap = idMap
	}

	/** Contains the vertices of the root level graph (i.e., included those vertices from the complete graph, that are nested within function definitions) */
	private rootVertices:      Set<NodeId> = new Set<NodeId>()
	/** All vertices in the complete graph (including those nested in function definition) */
	private vertexInformation: DataflowGraphVertices<Vertex> = new Map<NodeId, Vertex>()
	/** All edges in the complete graph (including those nested in function definition) */
	private edgeInformation:   Map<NodeId, OutgoingEdges<Edge>> = new Map<NodeId, OutgoingEdges<Edge>>()

	/**
	 * Get the {@link DataflowGraphVertexInfo} attached to a node as well as all outgoing edges.
	 *
	 * @param id                      - The id of the node to get
	 * @param includeDefinedFunctions - If true this will search function definitions as well and not just the toplevel
	 * @returns the node info for the given id (if it exists)
	 *
	 * @see #getVertex
	 */
	public get(id: NodeId, includeDefinedFunctions = true): [Vertex, OutgoingEdges] | undefined {
		// if we do not want to include function definitions, only retrieve the value if the id is part of the root vertices
		const vertex: Vertex | undefined = this.getVertex(id, includeDefinedFunctions)

		return vertex === undefined ? undefined : [vertex, this.outgoingEdges(id) ?? new Map()]
	}

	/**
	 * Get the {@link DataflowGraphVertexInfo} attached to a vertex.
	 *
	 * @param id                      - The id of the node to get
	 * @param includeDefinedFunctions - If true this will search function definitions as well and not just the toplevel
	 * @returns the node info for the given id (if it exists)
	 *
	 * @see #get
	 */
	public getVertex(id: NodeId, includeDefinedFunctions = true): Vertex | undefined {
		return includeDefinedFunctions || this.rootVertices.has(id) ? this.vertexInformation.get(id) : undefined
	}

	public outgoingEdges(id: NodeId): OutgoingEdges | undefined {
		return this.edgeInformation.get(id)
	}

	public ingoingEdges(id: NodeId): IngoingEdges | undefined {
		const edges = new Map<NodeId, Edge>()
		for(const [source, outgoing] of this.edgeInformation.entries()) {
			if(outgoing.has(id)) {
				edges.set(source, outgoing.get(id) as Edge)
			}
		}
		return edges
	}


	/** Retrieves the id-map to the normalized AST attached to the dataflow graph */
	public get idMap(): AstIdMap | undefined {
		return this._idMap
	}

	/** Allows setting the id-map explicitly (which should only be used when, e.g., you plan to compare two dataflow graphs on the same AST-basis) */
	public setIdMap(idMap: AstIdMap): void {
		this._idMap = idMap
	}


	/**
   * @param includeDefinedFunctions - If true this will iterate over function definitions as well and not just the toplevel
   * @returns the ids of all toplevel vertices in the graph together with their vertex information
	 *
	 * @see #edges
   */
	public* vertices(includeDefinedFunctions: boolean): IterableIterator<[NodeId, Vertex]> {
		if(includeDefinedFunctions) {
			yield* this.vertexInformation.entries()
		} else {
			for(const id of this.rootVertices) {
				yield [id, this.vertexInformation.get(id) as Vertex]
			}
		}
	}

	/**
	 * @returns the ids of all edges in the graph together with their edge information
	 *
	 * @see #vertices
	 */
	public* edges(): IterableIterator<[NodeId, OutgoingEdges]> {
		yield* this.edgeInformation.entries()
	}

	/**
	 * Returns true if the graph contains a node with the given id.
	 *
	 * @param id                      - The id to check for
	 * @param includeDefinedFunctions - If true this will check function definitions as well and not just the toplevel
	 */
	public hasVertex(id: NodeId, includeDefinedFunctions = true): boolean {
		return includeDefinedFunctions ? this.vertexInformation.has(id) : this.rootVertices.has(id)
	}

	/**
	 * Returns true if the root level of the graph contains a node with the given id.
	 */
	public isRoot(id: NodeId): boolean {
		return this.rootVertices.has(id)
	}

	public rootIds(): ReadonlySet<NodeId> {
		return this.rootVertices
	}

	/**
   * Adds a new vertex to the graph, for ease of use, some arguments are optional and filled automatically.
   *
	 * @param vertex - The vertex to add
	 * @param asRoot - If false, this will only add the vertex but do not add it to the {@link rootIds|root vertices} of the graph.
	 *                 This is probably only of use, when you construct dataflow graphs for tests.
	 *
   * @see DataflowGraphVertexInfo
   * @see DataflowGraphVertexArgument
   */
	public addVertex(vertex: DataflowGraphVertexArgument & Omit<Vertex, keyof DataflowGraphVertexArgument>, asRoot = true): this {
		const oldVertex = this.vertexInformation.get(vertex.id)
		if(oldVertex !== undefined) {
			return this
		}

		const fallback = vertex.tag === VertexType.VariableDefinition || vertex.tag === VertexType.Use || vertex.tag === VertexType.Value || (vertex.tag === VertexType.FunctionCall && vertex.onlyBuiltin) ? undefined : DataflowGraph.DEFAULT_ENVIRONMENT
		// keep a clone of the original environment
		const environment = vertex.environment === undefined ? fallback : cloneEnvironmentInformation(vertex.environment)



		this.vertexInformation.set(vertex.id, {
			...vertex,
			environment
		} as unknown as Vertex)
		if(asRoot) {
			this.rootVertices.add(vertex.id)
		}
		return this
	}

	/** {@inheritDoc} */
	public addEdge(from: NodeId, to: NodeId, edgeInfo: EdgeData<Edge>): this
	/** {@inheritDoc} */
	public addEdge(from: ReferenceForEdge, to: ReferenceForEdge, edgeInfo: EdgeData<Edge>): this
	/** {@inheritDoc} */
	public addEdge(from: NodeId | ReferenceForEdge, to: NodeId | ReferenceForEdge, edgeInfo: EdgeData<Edge>): this
	/**
   * Will insert a new edge into the graph,
   * if the direction of the edge is of no importance (`same-read-read` or `same-def-def`), source
   * and target will be sorted so that `from` has the lower, and `to` the higher id (default ordering).
	* Please note, that this will never make edges to {@link BuiltIn} as they are not part of the graph.
   */
	public addEdge(from: NodeId | ReferenceForEdge, to: NodeId | ReferenceForEdge, edgeInfo: EdgeData<Edge>): this {
		const { fromId, toId } = extractEdgeIds(from, to)
		const { type, ...rest } = edgeInfo

		if(fromId === toId || toId === BuiltIn) {
			return this
		}

		/* we now that we pass all required arguments */
		const edge = { types: type, ...rest } as unknown as Edge

		const existingFrom = this.edgeInformation.get(fromId)
		const edgeInFrom = existingFrom?.get(toId)

		if(edgeInFrom === undefined) {
			if(existingFrom === undefined) {
				this.edgeInformation.set(fromId, new Map([[toId, edge]]))
			} else {
				existingFrom.set(toId, edge)
			}
			this.installEdge(type, toId, fromId, edge)
		} else {
			// adding the type
			edgeInFrom.types |= type
		}
		return this
	}

	private installEdge(type: EdgeType, toId: NodeId, fromId: NodeId, edge: Edge) {
		if(type === EdgeType.DefinesOnCall) {
			const otherEdge: Edge = {
				...edge,
				types: EdgeType.DefinedByOnCall
			}
			const existingTo = this.edgeInformation.get(toId)
			if(existingTo === undefined) {
				this.edgeInformation.set(toId, new Map([[fromId, otherEdge]]))
			} else {
				existingTo.set(fromId, otherEdge)
			}
		}
	}

	/**
	 * Merges the other graph into *this* one (in-place). The return value is only for convenience.
	 *
	 * @param otherGraph        - The graph to merge into this one
	 * @param mergeRootVertices - If false, this will only merge the vertices and edges but exclude the root vertices this is probably only of use
	 * 													  in the context of function definitions
	 */
	public mergeWith(otherGraph: DataflowGraph<Vertex, Edge> | undefined, mergeRootVertices = true): this {
		if(otherGraph === undefined) {
			return this
		}

		// merge root ids
		if(mergeRootVertices) {
			for(const root of otherGraph.rootVertices) {
				this.rootVertices.add(root)
			}
		}

		for(const [id, info] of otherGraph.vertexInformation) {
			const currentInfo = this.vertexInformation.get(id)
			this.vertexInformation.set(id, currentInfo === undefined ? info : mergeNodeInfos(currentInfo, info))
		}

		this.mergeEdges(otherGraph)
		return this
	}

	private mergeEdges(otherGraph: DataflowGraph<Vertex, Edge>) {
		for(const [id, edges] of otherGraph.edgeInformation.entries()) {
			for(const [target, edge] of edges) {
				const existing = this.edgeInformation.get(id)
				if(existing === undefined) {
					this.edgeInformation.set(id, new Map([[target, edge]]))
				} else {
					const get = existing.get(target)
					if(get === undefined) {
						existing.set(target, edge)
					} else {
						get.types = get.types | edge.types
					}
				}
			}
		}
	}

	public equals(other: DataflowGraph<Vertex, Edge>, diff: true, names?: { left: string, right: string }): DataflowDifferenceReport
	public equals(other: DataflowGraph<Vertex, Edge>, diff?: false, names?: { left: string, right: string }): boolean
	public equals(other: DataflowGraph, diff = false, names = { left: 'left', right: 'right' }): boolean | DataflowDifferenceReport {
		const report = diffOfDataflowGraphs({ name: names.left, graph: this }, { name: names.right, graph: other })
		if(diff) {
			return report
		} else {
			return report.isEqual()
		}
	}

	/**
	 * Marks a vertex in the graph to be a definition
	 * @param reference - The reference to the vertex to mark as definition
	 */
	public setDefinitionOfVertex(reference: IdentifierReference): void {
		const vertex = this.getVertex(reference.nodeId, true)
		guard(vertex !== undefined, () => `node must be defined for ${JSON.stringify(reference)} to set reference`)
		if(vertex.tag === VertexType.FunctionDefinition || vertex.tag === VertexType.VariableDefinition) {
			vertex.controlDependencies = reference.controlDependencies
		} else {
			this.vertexInformation.set(reference.nodeId, { ...vertex, tag: 'variable-definition' })
		}
	}
}

function mergeNodeInfos<Vertex extends DataflowGraphVertexInfo>(current: Vertex, next: Vertex): Vertex {
	guard(current.tag === next.tag, () => `nodes to be joined for the same id must have the same tag, but ${JSON.stringify(current)} vs ${JSON.stringify(next)}`)
	guard(current.environment === next.environment, 'nodes to be joined for the same id must have the same environment')

	if(current.tag === 'variable-definition') {
		guard(current.scope === next.scope, 'nodes to be joined for the same id must have the same scope')
	} else if(current.tag === VertexType.FunctionCall) {
		guard(equalFunctionArguments(current.id, current.args, (next as DataflowGraphVertexFunctionCall).args), 'nodes to be joined for the same id must have the same function call information')
	} else if(current.tag === 'function-definition') {
		guard(current.scope === next.scope, 'nodes to be joined for the same id must have the same scope')
		guard(arrayEqual(current.exitPoints, (next as DataflowGraphVertexFunctionDefinition).exitPoints), 'nodes to be joined must have same exist points')
	}

	// make a copy
	return { ...current }
}
