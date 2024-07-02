/**
 * The builder printer takes a dataflow graph and produces a string-code representation of what a builder would look like to create the graph.
 * The goal is to create syntactically correct TypeScript code in a best-effort approach.
 */

import { assertUnreachable, isNotUndefined } from '../../../../src/util/assert'
import { DefaultMap } from '../../../../src/util/defaultmap'
import { EnvironmentBuilderPrinter } from './environment-builder-printer'
import { wrap, wrapControlDependencies, wrapReference } from './printer'
import { EdgeType, splitEdgeTypes } from '../../../../src/dataflow/graph/edge'
import type { DataflowGraph, FunctionArgument } from '../../../../src/dataflow/graph/graph'
import { isPositionalArgument } from '../../../../src/dataflow/graph/graph'
import type { NodeId } from '../../../../src/r-bridge/lang-4.x/ast/model/processing/node-id'
import type {
	DataflowGraphVertexFunctionCall, DataflowGraphVertexFunctionDefinition,
	DataflowGraphVertexInfo,
	DataflowGraphVertexUse
} from '../../../../src/dataflow/graph/vertex'
import { VertexType } from '../../../../src/dataflow/graph/vertex'
import { EmptyArgument } from '../../../../src/r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { REnvironmentInformation } from '../../../../src/dataflow/environments/environment'
import type { ControlDependency } from '../../../../src/dataflow/info'


/** we add the node id to allow convenience sorting if we want that in the future (or grouping or, ...) */
type Lines = [NodeId, string][]


export function printAsBuilder(graph: DataflowGraph): string {
	return new DataflowBuilderPrinter(graph).print()
}

const EdgeTypeFnMap: Record<EdgeType, string | undefined> = {
	[EdgeType.Reads]:                 'reads',
	[EdgeType.DefinedBy]:             'definedBy',
	[EdgeType.Calls]:                 'calls',
	[EdgeType.Returns]:               'returns',
	[EdgeType.DefinesOnCall]:         'definesOnCall',
	[EdgeType.Argument]: 	            'argument',
	[EdgeType.NonStandardEvaluation]: 'nse',
	[EdgeType.SideEffectOnCall]:      'sideEffectOnCall',
	/* treated specially as done by automated mirroring */
	[EdgeType.DefinedByOnCall]:       undefined
}

class DataflowBuilderPrinter {
	private lines:           Lines = []
	private graph:           DataflowGraph
	private rootIds:         Set<NodeId>
	private coveredVertices: Set<NodeId> = new Set()
	private coveredEdges:    Set<string> = new Set()

	constructor(graph: DataflowGraph) {
		this.rootIds = new Set(graph.rootIds())
		this.graph = graph
	}

	private process() {
		// we start by processing all uses and calls as they can automate a lot of things
		this.processUseInitial()
		this.processCalls()
		for(const [id, vertex] of this.graph.vertices(true)) {
			this.processVertex(id, vertex)
		}
	}

	private processUseInitial() {
		for(const [id, vertex] of this.graph.vertices(true)) {
			if(vertex.tag === 'use') {
				const res = this.processUseVertexInitial(id, vertex)
				if(res) {
					this.processEdges(id)
				}
			}
		}
	}
	private processCalls() {
		for(const [id, vertex] of this.graph.vertices(true)) {
			if(vertex.tag === VertexType.FunctionCall) {
				this.processVertex(id, vertex)
			}
		}
	}

	private groupEdgeTypesFrom(id: NodeId): DefaultMap<EdgeType, NodeId[]> {
		const outgoing = this.graph.outgoingEdges(id)
		const map: DefaultMap<EdgeType, NodeId[]> = new DefaultMap<EdgeType, NodeId[]>(() => [])
		if(outgoing) {
			for(const [target, edge] of outgoing) {
				for(const type of splitEdgeTypes(edge.types)) {
					map.get(type).push(target)
				}
			}
		}
		return map
	}

	private processCall(id: NodeId, vertex: DataflowGraphVertexFunctionCall) {
		const outgoing = this.groupEdgeTypesFrom(id)

		const returns = outgoing.get(EdgeType.Returns)
		const reads = outgoing.get(EdgeType.Reads)

		for(const target of returns ?? []) {
			this.coveredEdges.add(edgeId(id, target, EdgeType.Returns))
		}
		for(const target of reads ?? []) {
			this.coveredEdges.add(edgeId(id, target, EdgeType.Reads))
		}

		let readSuffix = ''
		if(reads.length > 1 && vertex.onlyBuiltin) {
			readSuffix = ', onlyBuiltIn: true'
		}
		this.recordFnCall(id,'call', [
			wrap(id),
			`[${vertex.args.map(a => this.processArgumentInCall(vertex.id, a)).join(', ')}]`,
			`{ returns: [${returns?.map(wrap).join(', ') ?? ''}], reads: [${reads?.map(wrap).join(', ') ?? ''}]${readSuffix}${this.getControlDependencySuffix(vertex.controlDependencies, ', ', '') ?? ''}${this.getEnvironmentSuffix(vertex.environment, ', ', '') ?? ''} }`,
			this.asRootArg(id)
		])
	}

	private asRootArg(id: NodeId) {
		return this.rootIds.has(id) ? undefined : 'false'
	}

	private processArgumentInCall(fn: NodeId, arg: FunctionArgument | undefined): string {
		if(arg === undefined || arg === EmptyArgument) {
			return 'EmptyArgument'
		} else if(isPositionalArgument(arg)) {
			const suffix = this.getControlDependencySuffix(this.controlDependenciesForArgument(arg.nodeId), ', { ') ?? ''
			this.handleArgumentArgLinkage(fn, arg.nodeId)
			return `argumentInCall('${arg.nodeId}'${suffix})`
		} else {
			this.coveredVertices.add(arg.nodeId)
			this.handleArgumentArgLinkage(fn, arg.nodeId)
			const suffix = this.getControlDependencySuffix(this.controlDependenciesForArgument(arg.nodeId), ', ', '') ?? ''
			return `argumentInCall('${arg.nodeId}', { name: '${arg.name}'${suffix} } )`
		}
	}

	private handleArgumentArgLinkage(fn: NodeId, id: NodeId) {
		if(typeof id === 'string' && id.endsWith('-arg')) {
			const withoutSuffix = id.slice(0, -4)
			this.coveredEdges.add(edgeId(id, withoutSuffix, EdgeType.Reads))
			if(!this.graph.hasVertex(withoutSuffix, true)) {
				// we have to add the argument linkage manually
				this.recordFnCall(fn, 'argument', [wrap(fn), wrap(id)])
				this.coveredEdges.add(edgeId(fn, id, EdgeType.Argument))
			}
		} else if(this.coveredVertices.has(id)) {
			this.recordFnCall(fn, 'argument', [wrap(fn), wrap(id)])
			this.coveredEdges.add(edgeId(fn, id, EdgeType.Argument))
		}
	}

	private controlDependenciesForArgument(id: NodeId): ControlDependency[] | undefined {
		// we ignore the control dependency of the argument in the call as it is usually separate, and the auto creation
		// will respect the corresponding node!
		return this.graph.getVertex(id, true)?.controlDependencies
	}

	private processVertex(id: NodeId, vertex: DataflowGraphVertexInfo): void {
		if(this.coveredVertices.has(id)) {
			// otherwise at the end to have a fresh covered edges cache
			this.processEdges(id)
			return
		}
		this.coveredVertices.add(id)
		const tag = vertex.tag
		switch(tag) {
			case VertexType.FunctionCall:
				this.processCall(id, vertex)
				break
			case VertexType.Use:
				this.processVertexUse(id, vertex)
				break
			case VertexType.Value: {
				const root = this.asRootArg(id)
				this.recordFnCall(id, 'constant', [
					wrap(id),
					this.getControlDependencySuffix(vertex.controlDependencies) ?? (root ? 'undefined' : undefined),
					root
				])
				break
			} case VertexType.VariableDefinition:
				this.processVariableDefinition(id, vertex)
				break
			case VertexType.FunctionDefinition:
				this.processFunctionDefinition(id, vertex)
				break
			default:
				assertUnreachable(tag)
		}
		this.processEdges(id)
	}

	private processUseVertexInitial(id: NodeId, vertex: DataflowGraphVertexUse): boolean {
		// if the id ends in arg and there is a vertex without the arg suffix we reset the vertex use and wait for the call
		if(typeof id === 'string' && id.endsWith('-arg') && this.graph.hasVertex(id.slice(0, -4), true)) {
			return false
		}
		this.coveredVertices.add(id)
		this.processVertexUse(id, vertex)
		return true
	}

	private processVertexUse(id: NodeId, vertex: DataflowGraphVertexUse) {
		const root = this.asRootArg(id)
		this.recordFnCall(id, 'use', [
			wrap(id),
			this.getControlDependencySuffix(vertex.controlDependencies) ?? (root ? 'undefined' : undefined),
			root
		])
	}

	private processFunctionDefinition(id: NodeId, vertex: DataflowGraphVertexFunctionDefinition) {
		const root = this.asRootArg(id)
		const suffix = this.getEnvironmentSuffix(vertex.environment, '{ ', ' }') ?? (root ? 'undefined' : undefined)
		this.recordFnCall(id,'defineFunction', [
			wrap(id),
			`[${vertex.exitPoints.map(wrap).join(', ')}]`,
			`{
				out:               [${vertex.subflow.out.map(wrapReference).join(', ')}],
				in:                [${vertex.subflow.in.map(wrapReference).join(', ')}],
				unknownReferences: [${vertex.subflow.unknownReferences.map(wrapReference).join(', ')}],
				entryPoint:        ${wrap(vertex.subflow.entryPoint)},
				graph:             new Set([${[...vertex.subflow.graph].map(wrap).join(', ')}]),
				environment:       ${new EnvironmentBuilderPrinter(vertex.subflow.environment).print()}
			}`, suffix, root
		])
	}


	private processVariableDefinition(id: NodeId, vertex: DataflowGraphVertexInfo) {
		const definedBy = this.groupEdgeTypesFrom(id).get(EdgeType.DefinedBy)

		for(const target of definedBy ?? []) {
			this.coveredEdges.add(edgeId(id, target, EdgeType.DefinedBy))
		}

		this.recordFnCall(id,'defineVariable', [
			wrap(id),
			'{ definedBy: [' + (definedBy?.map(wrap).join(', ') ?? '') + ']' + (this.getControlDependencySuffix(vertex.controlDependencies, ', ', '') ?? '') + ' }',
			this.asRootArg(id)
		])
	}

	private getControlDependencySuffix(arg: ControlDependency[] | undefined, prefix: string = '{ ', suffix: string = ' }'): string | undefined {
		if(arg !== undefined) {
			return `${prefix}controlDependencies: ${wrapControlDependencies(arg)}${suffix}`
		}
		return undefined
	}

	private getEnvironmentSuffix(env: REnvironmentInformation | undefined, prefix: string = '{ ', suffix: string = ' }'): string | undefined {
		if(env === undefined) {
			return undefined
		}
		const printed = new EnvironmentBuilderPrinter(env).print()
		return printed === '' ? undefined : `${prefix}environment: ${printed}${suffix}`
	}

	private processEdges(id: NodeId): void {
		const outgoing = this.groupEdgeTypesFrom(id)
		if(!outgoing) {
			return
		}
		for(const [type, edges] of outgoing.entries()) {
			const remainingEdges = edges.filter(target => !this.coveredEdges.has(edgeId(id, target, type)))
			this.processEdge(id, type, remainingEdges)
		}
	}

	private processEdge(from: NodeId, type: EdgeType, to: NodeId[]): void {
		if(to.length === 0) {
			return
		}
		for(const target of to) {
			this.coveredEdges.add(edgeId(from, target, type))
		}

		const mappedName = EdgeTypeFnMap[type]
		if(mappedName === undefined) {
			// we ignore this edge type as it is a special case
			if(type !== EdgeType.DefinedByOnCall) {
				console.log('TODO: edge type', type)
			}
			return
		}
		this.recordFnCall(from, mappedName, [wrap(from),  this.optionalArrayWrap(to)])
	}

	private optionalArrayWrap(to: NodeId[]) {
		return to.length === 1 ? wrap(to[0]) : `[${to.map(wrap).join(', ')}]`
	}

	private recordFnCall(id: NodeId, name: string, args: (string | undefined)[]): void {
		this.lines.push([id, `    .${name}(${args.filter(isNotUndefined).join(', ')})`])
	}

	public print(): string {
		this.process()
		return 'emptyGraph()\n' + this.lines.map(([, line]) => line).join('\n')
	}
}

function edgeId(from: NodeId, to: NodeId, type: EdgeType): string {
	return `${from}->${to}[${type}]`
}
