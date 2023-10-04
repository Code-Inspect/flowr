import {
	foldAst,
	FoldFunctions,
	NodeId, NormalizedAst, ParentInformation, RNodeWithParent, RRepeatLoop, RWhileLoop
} from '../r-bridge'
import { MergeableRecord } from './objects'

interface CFGVertex {
	id:        NodeId
	name:      string
	/** the content may be undefined, if the node is an artificial exit point node that i use to mark the exit point of an if condition, a function, etc. */
	content:   string | undefined
	/** in case of a function definition */
	children?: NodeId[]
}

export interface CFGEdge {
	/** control- and flow-dependency */
	label: 'CD' | 'FD'
}

class CFG {
	private rootVertices:      Set<NodeId> = new Set<NodeId>()
	private vertexInformation: Map<NodeId, CFGVertex> = new Map<NodeId, CFGVertex>()
	private edgeInformation:   Map<NodeId, Map<NodeId, CFGEdge>> = new Map<NodeId, Map<NodeId, CFGEdge>>()

	addNode(node: CFGVertex, rootVertex = true): void {
		if(this.vertexInformation.has(node.id)) {
			throw new Error(`Node with id ${node.id} already exists`)
		}
		this.vertexInformation.set(node.id, node)
		if(rootVertex) {
			this.rootVertices.add(node.id)
		}
	}

	addEdge(from: NodeId, to: NodeId, edge: CFGEdge): void {
		if(!this.edgeInformation.has(from)) {
			this.edgeInformation.set(from, new Map<NodeId, CFGEdge>())
		}
		this.edgeInformation.get(from)?.set(to, edge)
	}


	rootVertexIds(): ReadonlySet<NodeId> {
		return this.rootVertices
	}

	vertices(): ReadonlyMap<NodeId, CFGVertex> {
		return this.vertexInformation
	}

	edges(): ReadonlyMap<NodeId, ReadonlyMap<NodeId, CFGEdge>> {
		return this.edgeInformation
	}

	merge(other: CFG): void {
		for(const [id, node] of other.vertexInformation) {
			this.addNode(node, other.rootVertices.has(id))
		}
		for(const [from, edges] of other.edgeInformation) {
			for(const [to, edge] of edges) {
				this.addEdge(from, to, edge)
			}
		}
	}
}

export interface ControlFlowInformation extends MergeableRecord {
	returns:     NodeId[],
	breaks:      NodeId[],
	nexts:       NodeId[],
	entryPoints: NodeId[],
	exitPoints:  NodeId[],
	graph:       CFG
}


const cfgFolds: FoldFunctions<ParentInformation, ControlFlowInformation> = {
	foldNumber:  cfgLeaf,
	foldString:  cfgLeaf,
	foldLogical: cfgLeaf,
	foldSymbol:  cfgLeaf,
	foldAccess:  cfgLeaf /* TODO */,
	binaryOp:    {
		foldLogicalOp:    cfgLeaf /* TODO */,
		foldArithmeticOp: cfgLeaf /* TODO */,
		foldComparisonOp: cfgLeaf /* TODO */,
		foldAssignment:   cfgLeaf /* TODO */,
		foldPipe:         cfgLeaf /* TODO */,
		foldModelFormula: cfgLeaf /* TODO */
	},
	unaryOp: {
		foldArithmeticOp: cfgLeaf /* TODO */,
		foldLogicalOp:    cfgLeaf /* TODO */,
		foldModelFormula: cfgLeaf /* TODO */
	},
	other: {
		foldComment:       cfgIgnore,
		foldLineDirective: cfgIgnore
	},
	loop: {
		foldFor:    cfgLeaf /* TODO */,
		foldRepeat: cfgRepeat,
		foldWhile:  cfgWhile,
		foldBreak:  cfgBreak,
		foldNext:   cfgNext
	},
	foldIfThenElse: cfgIfThenElse,
	foldExprList:   cfgExprList,
	functions:      {
		foldFunctionDefinition: cfgLeaf /* TODO */,
		foldFunctionCall:       cfgLeaf /* TODO; CFG: jump links for return */,
		foldParameter:          cfgLeaf /* TODO */,
		foldArgument:           cfgLeaf /* TODO */
	}
}

export function extractCFG<Info=ParentInformation>(ast: NormalizedAst<Info>): ControlFlowInformation {
	return foldAst(ast.ast, cfgFolds)
}


function getLexeme(n: RNodeWithParent) {
	return n.info.fullLexeme ?? n.lexeme ?? '<unknown>'
}

function cfgLeaf(leaf: RNodeWithParent): ControlFlowInformation {
	const graph = new CFG()
	graph.addNode({ id: leaf.info.id, name: leaf.type, content: getLexeme(leaf) })
	return { graph, breaks: [], nexts: [], returns: [], exitPoints: [leaf.info.id], entryPoints: [leaf.info.id] }
}

function cfgBreak(leaf: RNodeWithParent): ControlFlowInformation {
	return { ...cfgLeaf(leaf), breaks: [leaf.info.id] }
}

function cfgNext(leaf: RNodeWithParent): ControlFlowInformation {
	return { ...cfgLeaf(leaf), nexts: [leaf.info.id] }
}

function cfgIgnore(_leaf: RNodeWithParent): ControlFlowInformation {
	return { graph: new CFG(), breaks: [], nexts: [], returns: [], exitPoints: [], entryPoints: [] }
}

function cfgIfThenElse(ifNode: RNodeWithParent, condition: ControlFlowInformation, then: ControlFlowInformation, otherwise: ControlFlowInformation | undefined): ControlFlowInformation {
	const graph = new CFG()
	graph.addNode({ id: ifNode.info.id, name: ifNode.type, content: getLexeme(ifNode) })
	graph.addNode({ id: ifNode.info.id + '-exit', name: 'if-exit', content: undefined })
	graph.merge(condition.graph)
	graph.merge(then.graph)
	if(otherwise) {
		graph.merge(otherwise.graph)
	}

	for(const exitPoint of condition.exitPoints) {
		for(const entryPoint of [...then.entryPoints, ...otherwise?.entryPoints ?? []]) {
			graph.addEdge(entryPoint, exitPoint, { label: 'CD' })
		}
	}
	for(const entryPoint of condition.entryPoints) {
		graph.addEdge(entryPoint, ifNode.info.id, { label: 'FD' })
	}

	for(const exit of [...then.exitPoints, ...otherwise?.exitPoints ?? []]) {
		graph.addEdge(ifNode.info.id + '-exit', exit, { label: 'FD' })
	}
	if(!otherwise) {
		for(const exitPoint of condition.exitPoints) {
			graph.addEdge(ifNode.info.id + '-exit', exitPoint, { label: 'CD' })
		}
	}

	return {
		graph,
		breaks:      [...then.breaks, ...otherwise?.breaks ?? []],
		nexts:       [...then.nexts, ...otherwise?.nexts ?? []],
		returns:     [...then.returns, ...otherwise?.returns ?? []],
		exitPoints:  [ifNode.info.id + '-exit'],
		entryPoints: [ifNode.info.id]
	}
}

function cfgRepeat(repeat: RRepeatLoop<ParentInformation>, body: ControlFlowInformation): ControlFlowInformation {
	const graph = body.graph
	graph.addNode({ id: repeat.info.id, name: repeat.type, content: getLexeme(repeat) })
	graph.addNode({ id: repeat.info.id + '-exit', name: 'repeat-exit', content: undefined })

	for(const entryPoint of body.entryPoints) {
		graph.addEdge(repeat.info.id, entryPoint, { label: 'FD' })
	}

	// loops automatically
	for(const next of [...body.nexts, ...body.exitPoints]) {
		graph.addEdge(repeat.info.id, next, { label: 'FD' })
	}

	for(const breakPoint of body.breaks) {
		graph.addEdge(repeat.info.id + '-exit', breakPoint, { label: 'FD' })
	}

	return { graph, breaks: [], nexts: [], returns: body.returns, exitPoints: [repeat.info.id + '-exit'], entryPoints: [repeat.info.id] }
}

function cfgWhile(whileLoop: RWhileLoop<ParentInformation>, condition: ControlFlowInformation, body: ControlFlowInformation): ControlFlowInformation {
	const graph = condition.graph
	graph.addNode({ id: whileLoop.info.id, name: whileLoop.type, content: getLexeme(whileLoop) })
	graph.addNode({ id: whileLoop.info.id + '-exit', name: 'while-exit', content: undefined })

	graph.merge(body.graph)

	for(const entry of condition.entryPoints) {
		graph.addEdge(entry, whileLoop.info.id, { label: 'FD' })
	}

	for(const exit of condition.exitPoints) {
		for(const entry of body.entryPoints) {
			graph.addEdge(entry, exit, { label: 'CD' })
		}
	}

	for(const entryPoint of body.entryPoints) {
		graph.addEdge(whileLoop.info.id, entryPoint, { label: 'FD' })
	}

	for(const next of [...body.nexts, ...body.exitPoints]) {
		graph.addEdge(whileLoop.info.id, next, { label: 'FD' })
	}

	for(const breakPoint of body.breaks) {
		graph.addEdge(whileLoop.info.id + '-exit', breakPoint, { label: 'FD' })
	}
	// while can break on the condition as well
	for(const exit of condition.exitPoints) {
		graph.addEdge(whileLoop.info.id + '-exit', exit, { label: 'CD' })
	}

	return { graph, breaks: [], nexts: [], returns: body.returns, exitPoints: [whileLoop.info.id + '-exit'], entryPoints: [whileLoop.info.id] }
}



function cfgExprList(_node: RNodeWithParent, expressions: ControlFlowInformation[]): ControlFlowInformation {
	const result: ControlFlowInformation = { graph: new CFG(), breaks: [], nexts: [], returns: [], exitPoints: [], entryPoints: [] }
	let first = true
	for(const expression of expressions) {
		if(first) {
			result.entryPoints = expression.entryPoints
			first = false
		} else {
			for(const previousExitPoint of result.exitPoints) {
				for(const entryPoint of expression.entryPoints) {
					result.graph.addEdge(entryPoint, previousExitPoint, { label: 'FD' })
				}
			}
		}
		result.graph.merge(expression.graph)
		result.breaks.push(...expression.breaks)
		result.nexts.push(...expression.nexts)
		result.returns.push(...expression.returns)
		// TODO: no FD after break/next/return?
		result.exitPoints = expression.exitPoints
	}
	return result
}
