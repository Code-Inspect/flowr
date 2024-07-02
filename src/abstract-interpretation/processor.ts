import type { DataflowInformation } from '../dataflow/info'
import { CfgVertexType, extractCFG } from '../util/cfg/cfg'
import { visitCfg } from '../util/cfg/visitor'
import { guard } from '../util/assert'

import type { Handler } from './handler/handler'
import { BinOp } from './handler/binop/binop'
import { Domain, unifyDomains } from './domain'
import { log } from '../util/log'
import type { NodeId } from '../r-bridge/lang-4.x/ast/model/processing/node-id'
import type {
	NormalizedAst,
	ParentInformation,
	RNodeWithParent
} from '../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { DataflowGraphVertexInfo } from '../dataflow/graph/vertex'
import type { OutgoingEdges } from '../dataflow/graph/graph'
import { edgeIncludesType, EdgeType } from '../dataflow/graph/edge'
import { RType } from '../r-bridge/lang-4.x/ast/model/type'

export const aiLogger = log.getSubLogger({ name: 'abstract-interpretation' })

export interface AINode {
	readonly id:      NodeId
	readonly domain:  Domain
	readonly astNode: RNodeWithParent<ParentInformation>
}

class Stack<ElementType> {
	private backingStore: ElementType[] = []

	size(): number {
		return this.backingStore.length
	}
	peek(): ElementType | undefined {
		return this.backingStore[this.size() - 1]
	}
	pop(): ElementType | undefined {
		return this.backingStore.pop()
	}
	push(item: ElementType): ElementType {
		this.backingStore.push(item)
		return item
	}
}

function getDomainOfDfgChild(node: NodeId, dfg: DataflowInformation, nodeMap: Map<NodeId, AINode>): Domain {
	const dfgNode: [DataflowGraphVertexInfo, OutgoingEdges] | undefined = dfg.graph.get(node)
	guard(dfgNode !== undefined, `No DFG-Node found with ID ${node}`)
	const [_, children] = dfgNode
	const ids = Array.from(children.entries())
		.filter(([_, edge]) => edgeIncludesType(edge.types, EdgeType.Reads))
		.map(([id, _]) => id)
	const domains: Domain[] = []
	for(const id of ids) {
		const domain = nodeMap.get(id)?.domain
		guard(domain !== undefined, `No domain found for ID ${id}`)
		domains.push(domain)
	}
	return unifyDomains(domains)
}

export function runAbstractInterpretation(ast: NormalizedAst, dfg: DataflowInformation): DataflowInformation {
	const cfg = extractCFG(ast)
	const operationStack = new Stack<Handler<AINode>>()
	const nodeMap = new Map<NodeId, AINode>()
	visitCfg(cfg, (node, _) => {
		const astNode = ast.idMap.get(node.id)
		if(astNode?.type === RType.BinaryOp) {
			operationStack.push(new BinOp(astNode)).enter()
		} else if(astNode?.type === RType.Symbol) {
			operationStack.peek()?.next({
				id:      astNode.info.id,
				domain:  getDomainOfDfgChild(node.id, dfg, nodeMap),
				astNode: astNode,
			})
		} else if(astNode?.type === RType.Number){
			const num = astNode.content.num
			operationStack.peek()?.next({
				id:      astNode.info.id,
				domain:  Domain.fromScalar(num),
				astNode: astNode,
			})
		} else if(node.type === CfgVertexType.EndMarker) {
			const operation = operationStack.pop()
			if(operation === undefined) {
				return
			}
			const operationResult = operation.exit()
			guard(!nodeMap.has(operationResult.id), `Domain for ID ${operationResult.id} already exists`)
			nodeMap.set(operationResult.id, operationResult)
			operationStack.peek()?.next(operationResult)
		} else {
			aiLogger.warn(`Unknown node type ${node.type}`)
		}
	})
	return dfg
}
