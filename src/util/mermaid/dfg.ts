import type { NodeId } from '../../r-bridge'
import type { SourceRange } from '../range'
import type {
	DataflowFunctionFlowInformation,
	DataflowGraph,
	DataflowGraphEdgeAttribute,
	DataflowGraphVertexInfo,
	DataflowMap,
	FunctionArgument,
	IdentifierReference
} from '../../dataflow'
import {
	BuiltIn,
	EdgeType
} from '../../dataflow'
import { guard } from '../assert'
import { jsonReplacer } from '../json'
import type { DataflowScopeName } from '../../dataflow/environments'
import { escapeMarkdown, mermaidCodeToUrl } from './mermaid'


interface MermaidGraph {
	nodeLines:           string[]
	edgeLines:           string[]
	hasBuiltIn:          boolean
	includeEnvironments: boolean
	mark:                Set<NodeId> | undefined
	/** in the form of from-\>to because I am lazy, see {@link encodeEdge} */
	presentEdges:        Set<string>
	// keep for subflows
	rootGraph:           DataflowGraph
}

export function formatRange(range: SourceRange | undefined): string {
	if(range === undefined) {
		return '??'
	}

	return `${range.start.line}.${range.start.column}-${range.end.line}.${range.end.column}`
}

function scopeToMermaid(scope: DataflowScopeName, when: DataflowGraphEdgeAttribute): string {
	const whenText = when === 'always' ? '' : `, ${when}`
	return `, *${scope.replace('<', '#lt;')}${whenText}*`
}

function createArtificialExitPoints(exitPoints: NodeId[], mermaid: MermaidGraph, dataflowIdMap: DataflowMap, idPrefix: string) {
	for(const exitPoint of exitPoints) {
		if(!mermaid.rootGraph.hasNode(exitPoint, true)) {
			const node = dataflowIdMap.get(exitPoint)
			guard(node !== undefined, 'exit point not found')
			mermaid.nodeLines.push(` ${idPrefix}${exitPoint}{{"${node.lexeme ?? '??'} (${exitPoint})\n      ${formatRange(dataflowIdMap.get(exitPoint)?.location)}"}}`)
		}
		mermaid.nodeLines.push(`    style ${idPrefix}${exitPoint} stroke-width:6.5px;`)
	}
}

function subflowToMermaid(nodeId: NodeId, exitPoints: NodeId[], subflow: DataflowFunctionFlowInformation | undefined, dataflowIdMap: DataflowMap | undefined, mermaid: MermaidGraph, idPrefix = ''): void {
	if(subflow === undefined) {
		return
	}
	const subflowId = `${idPrefix}flow-${nodeId}`
	mermaid.nodeLines.push(`\nsubgraph "${subflowId}" [function ${nodeId}]`)
	const subgraph = graphToMermaidGraph(subflow.graph, mermaid.rootGraph, dataflowIdMap, null, idPrefix, mermaid.includeEnvironments, mermaid.mark, mermaid.rootGraph)
	mermaid.nodeLines.push(...subgraph.nodeLines)
	mermaid.edgeLines.push(...subgraph.edgeLines)
	for(const [color, pool] of [['purple', subflow.in], ['green', subflow.out], ['orange', subflow.unknownReferences]]) {
		for(const out of pool as IdentifierReference[]) {
			if(!mermaid.mark?.has(out.nodeId)) {
				// in/out/active for unmarked
				mermaid.nodeLines.push(`    style ${idPrefix}${out.nodeId} stroke:${color as string},stroke-width:4px; `)
			}
		}
	}

	if(dataflowIdMap !== undefined) {
		createArtificialExitPoints(exitPoints, mermaid, dataflowIdMap, idPrefix)
	}

	mermaid.nodeLines.push('end')
	mermaid.edgeLines.push(`${idPrefix}${nodeId} -.-|function| ${subflowId}\n`)
}


function printArg(arg: IdentifierReference | '<value>' | 'empty' | undefined): string {
	if(arg === 'empty') {
		return ''
	}
	if(arg === undefined || arg === '<value>') {
		return '??'
	}
	return `${arg.nodeId}`
}
function displayFunctionArgMapping(argMapping: FunctionArgument[]): string {
	const result = []
	for(const arg of argMapping) {
		result.push(Array.isArray(arg) ? `${arg[0]} -> ${printArg(arg[1])}` : `${printArg(arg)}`)
	}
	return result.length === 0 ? '' : `\n    (${result.join(', ')})`
}
function encodeEdge(from: string, to: string, types: Set<EdgeType>, attribute: string): string {
	// sort from and to for same edges and relates be order independent
	if(types.has(EdgeType.SameReadRead) || types.has(EdgeType.SameDefDef) || types.has(EdgeType.Relates)) {
		if(from > to) {
			({ from, to } = { from: to, to: from })
		}
	}
	return `${from}->${to}["${[...types].join(':')} (${attribute})"]`
}


function mermaidNodeBrackets(def: boolean, fCall: boolean) {
	let open: string
	let close: string
	if(def) {
		open = '['
		close = ']'
	} else if(fCall) {
		open = '[['
		close = ']]'
	} else {
		open = '(['
		close = '])'
	}
	return { open, close }
}

function nodeToMermaid(graph: DataflowGraph, info: DataflowGraphVertexInfo, mermaid: MermaidGraph, id: NodeId, idPrefix: string, dataflowIdMap: DataflowMap | undefined, mark: Set<NodeId> | undefined): void {
	const def = info.tag === 'variable-definition' || info.tag === 'function-definition'
	const fCall = info.tag === 'function-call'
	const defText = def ? scopeToMermaid(info.scope, info.when) : ''
	const { open, close } = mermaidNodeBrackets(def, fCall)

	if(mermaid.includeEnvironments) {
		mermaid.nodeLines.push(`    %% ${id}: ${JSON.stringify(info.environment, jsonReplacer)}`)
	}
	mermaid.nodeLines.push(`    ${idPrefix}${id}${open}"\`${escapeMarkdown(info.name)} (${id}${defText})\n      *${formatRange(dataflowIdMap?.get(id)?.location)}*${
		fCall ? displayFunctionArgMapping(info.args) : ''
	}\`"${close}`)
	if(mark?.has(id)) {
		mermaid.nodeLines.push(`    style ${idPrefix}${id} stroke:black,stroke-width:7px; `)
	}

	const edges = mermaid.rootGraph.get(id, true)
	guard(edges !== undefined, `node ${id} must be found`)
	for(const [target, edge] of [...edges[1]]) {
		const dotEdge = edge.types.has(EdgeType.SameDefDef) || edge.types.has(EdgeType.SameReadRead) || edge.types.has(EdgeType.Relates)
		const edgeId = encodeEdge(idPrefix + id, idPrefix + target, edge.types, edge.attribute)
		if(!mermaid.presentEdges.has(edgeId)) {
			mermaid.presentEdges.add(edgeId)
			mermaid.edgeLines.push(`    ${idPrefix}${id} ${dotEdge ? '-.-' : '-->'}|"${[...edge.types].join(', ')} (${edge.attribute})"| ${idPrefix}${target}`)
			if(target === BuiltIn) {
				mermaid.hasBuiltIn = true
			}
		}
	}
	if(info.tag === 'function-definition') {
		subflowToMermaid(id, info.exitPoints, info.subflow, dataflowIdMap, mermaid, idPrefix)
	}
}


// make the passing of root ids more performant again
function graphToMermaidGraph(rootIds: ReadonlySet<NodeId>, graph: DataflowGraph, dataflowIdMap: DataflowMap | undefined, prefix: string | null = 'flowchart TD', idPrefix = '', includeEnvironments = true, mark?: Set<NodeId>, rootGraph?: DataflowGraph): MermaidGraph {
	const mermaid: MermaidGraph = { nodeLines: prefix === null ? [] : [prefix], edgeLines: [], presentEdges: new Set<string>(), hasBuiltIn: false, mark, rootGraph: rootGraph ?? graph, includeEnvironments }

	for(const [id, info] of graph.vertices(true)) {
		if(rootIds.has(id)) {
			nodeToMermaid(graph, info, mermaid, id, idPrefix, dataflowIdMap, mark)
		}
	}
	if(mermaid.hasBuiltIn) {
		mermaid.nodeLines.push(`    ${idPrefix}${BuiltIn}["Built-in"]`)
	}
	return mermaid
}

export function graphToMermaid(graph: DataflowGraph, dataflowIdMap: DataflowMap | undefined, prefix: string | null = 'flowchart TD', idPrefix = '', includeEnvironments?: boolean, mark?: Set<NodeId>, rootGraph?: DataflowGraph): string {
	const mermaid = graphToMermaidGraph(graph.rootIds(), graph, dataflowIdMap, prefix, idPrefix, includeEnvironments, mark, rootGraph)
	return `${mermaid.nodeLines.join('\n')}\n${mermaid.edgeLines.join('\n')}`
}

/**
 * Converts a dataflow graph to a mermaid url that visualizes the graph.
 *
 * @param graph         - The graph to convert
 * @param dataflowIdMap - ID map to use to get access to the graph id mappings
 * @param includeEnvironments - Whether to include the environments in the mermaid graph code
 * @param mark          - Special nodes to mark (e.g. those included in the slice)
 */
export function graphToMermaidUrl(graph: DataflowGraph, dataflowIdMap: DataflowMap, includeEnvironments?: boolean, mark?: Set<NodeId>): string {
	return mermaidCodeToUrl(graphToMermaid(graph, dataflowIdMap, undefined, undefined, includeEnvironments, mark))
}

export interface LabeledDiffGraph {
	label: string
	graph: DataflowGraph
}

/** uses same id map but ensures, it is different from the rhs so that mermaid can work with that */
export function diffGraphsToMermaid(left: LabeledDiffGraph, right: LabeledDiffGraph, dataflowIdMap: DataflowMap | undefined, prefix: string): string {
	// we add the prefix ourselves
	const leftGraph = graphToMermaid(left.graph, dataflowIdMap, '', `l-${left.label}`)
	const rightGraph = graphToMermaid(right.graph, dataflowIdMap, '', `r-${right.label}`)

	return `${prefix}flowchart TD\nsubgraph "${left.label}"\n${leftGraph}\nend\nsubgraph "${right.label}"\n${rightGraph}\nend`
}

export function diffGraphsToMermaidUrl(left: LabeledDiffGraph, right: LabeledDiffGraph, dataflowIdMap: DataflowMap | undefined, prefix: string): string {
	return mermaidCodeToUrl(diffGraphsToMermaid(left, right, dataflowIdMap, prefix))
}
