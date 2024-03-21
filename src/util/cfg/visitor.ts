import type { NodeId } from '../../r-bridge'
import { guard } from '../assert'
import type { CfgEdge, CfgVertex, ControlFlowInformation } from './cfg'

export interface NodeVisitingContext {
	parent:   {
		vertex: NodeId,
		edge:   CfgEdge
	} | 'root',
	cfg:      ControlFlowInformation,
	visited:  Set<NodeId>,
	/** contains the current vertex as well */
	siblings: NodeId[]
}

interface PredecessorInformation {
	source: NodeId,
	edge:   CfgEdge
}

export type OnEnterVisitNode = (node: CfgVertex, context: NodeVisitingContext) => void

class ControlFlowGraphExecutionTraceVisitor {
	private readonly onEnter: OnEnterVisitNode

	constructor(onEnter: OnEnterVisitNode) {
		this.onEnter = onEnter
	}

	private visitSingle(node: CfgVertex, context: NodeVisitingContext): void {
		if(context.visited.has(node.id)) {
			return
		}
		// only visit a node if we have visited all of its successors
		const successorEdges = context.cfg.graph.edges().get(node.id)
		if(successorEdges) {
			for(const [target,] of successorEdges) {
				if(!context.visited.has(target)) {
					return
				}
			}
		}
		context.visited.add(node.id)

		this.onEnter(node, context)

		// find all ingoing edges
		const predecessors = this.retrieveAllPredecessors(context, node)
		const siblings = predecessors.map(p => p.source)
		for(const predecessor of predecessors) {
			const { source, edge } = predecessor
			const sourceVertex = context.cfg.graph.vertices().get(source)
			guard(sourceVertex !== undefined, () => `Source vertex with id ${source} not found`)
			this.visitSingle(sourceVertex, {
				parent:  { vertex: node.id, edge },
				cfg:     context.cfg,
				visited: context.visited,
				siblings
			})
		}
	}

	private retrieveAllPredecessors(context: NodeVisitingContext, node: CfgVertex) {
		const predecessors: PredecessorInformation[] = []
		for(const entry of context.cfg.graph.edges().entries()) {
			const [source, targets] = entry
			const target = targets.get(node.id)
			if(target) {
				predecessors.push({ source, edge: target })
			}
		}
		return predecessors
	}

	visit(cfg: ControlFlowInformation): void {
		const visited = new Set<NodeId>()
		for(const id of cfg.entryPoints) {
			const node = cfg.graph.vertices().get(id)
			guard(node !== undefined, `Node with id ${id} not present`)
			this.visitSingle(node, { parent: 'root', cfg, siblings: [...cfg.entryPoints], visited })
		}
	}

}

export function visitCfg(cfg: ControlFlowInformation, onVisit: OnEnterVisitNode): void {
	return new ControlFlowGraphExecutionTraceVisitor(onVisit).visit(cfg)
}
