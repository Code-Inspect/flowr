import type { NodeId } from '../../r-bridge'
import { EmptyArgument } from '../../r-bridge'
import type { SourceRange } from '../range'
import type {
	DataflowFunctionFlowInformation,
	DataflowGraph,
	DataflowGraphVertexInfo,
	DataflowMap,
	FunctionArgument,
	IdentifierDefinition,
	IdentifierReference,
	IEnvironment
} from '../../dataflow'
import {
	BuiltIn,
	BuiltInEnvironment,
	CONSTANT_NAME,
	EdgeType
} from '../../dataflow'
import { guard } from '../assert'
import { escapeMarkdown, mermaidCodeToUrl } from './mermaid'


type MarkVertex = `${string}`
type MarkEdge = `${string}->${string}`

type Mark = MarkVertex | MarkEdge

interface MermaidGraph {
	nodeLines:           string[]
	edgeLines:           string[]
	hasBuiltIn:          boolean
	includeEnvironments: boolean
	mark:                Set<Mark> | undefined
	/** in the form of from-\>to because I am lazy, see {@link encodeEdge} */
	presentEdges:        Set<string>
	// keep for sub-flows
	rootGraph:           DataflowGraph
}

export function formatRange(range: SourceRange | undefined): string {
	if(range === undefined) {
		return '??-??'
	}

	return `${range[0]}.${range[1]}-${range[2]}.${range[3]}`
}

function createArtificialExitPoints(exitPoints: readonly NodeId[], mermaid: MermaidGraph, dataflowIdMap: DataflowMap, idPrefix: string) {
	for(const exitPoint of exitPoints) {
		if(!mermaid.rootGraph.hasVertex(exitPoint, true)) {
			const node = dataflowIdMap.get(exitPoint)
			guard(node !== undefined, 'exit point not found')
			mermaid.nodeLines.push(` ${idPrefix}${exitPoint}{{"${node.lexeme ?? '??'} (${exitPoint})\n      ${formatRange(dataflowIdMap.get(exitPoint)?.location)}"}}`)
		}
		mermaid.nodeLines.push(`    style ${idPrefix}${exitPoint} stroke-width:6.5px;`)
	}
}

function subflowToMermaid(nodeId: NodeId, exitPoints: readonly NodeId[], subflow: DataflowFunctionFlowInformation | undefined, dataflowIdMap: DataflowMap | undefined, mermaid: MermaidGraph, idPrefix = ''): void {
	if(subflow === undefined) {
		return
	}
	const subflowId = `${idPrefix}flow-${nodeId}`
	mermaid.nodeLines.push(`\nsubgraph "${subflowId}" [function ${nodeId}]`)
	const subgraph = graphToMermaidGraph(subflow.graph, { graph: mermaid.rootGraph, rootGraph: mermaid.rootGraph, dataflowIdMap, idPrefix, includeEnvironments: mermaid.includeEnvironments, mark: mermaid.mark })
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


function printArg(arg: IdentifierReference | '<value>' | 'empty' | typeof EmptyArgument | undefined): string {
	if(arg === 'empty') {
		return ''
	} else if(arg === undefined || arg === '<value>') {
		return '??'
	} else if(arg === EmptyArgument) {
		return '[empty]'
	} else {
		const deps = arg.controlDependency ? '[' + arg.controlDependency.join(',') + ']': ''
		return `${arg.nodeId}${deps}`
	}
}
function displayFunctionArgMapping(argMapping: FunctionArgument[]): string {
	const result = []
	for(const arg of argMapping) {
		result.push(Array.isArray(arg) ? `${arg[0]} -> ${printArg(arg[1])}` : `${printArg(arg)}`)
	}
	return result.length === 0 ? '' : `\n    (${result.join(', ')})`
}
function encodeEdge(from: string, to: string, types: Set<string>): string {
	// sort from and to for same edges and relates be order independent
	if(types.has(EdgeType.SameReadRead) || types.has(EdgeType.SameDefDef) || types.has(EdgeType.Relates)) {
		if(from > to) {
			({ from, to } = { from: to, to: from })
		}
	}
	return `${from}->${to}["${[...types].join(':')}"]`
}


function mermaidNodeBrackets(tag: DataflowGraphVertexInfo['tag']): { open: string, close: string } {
	let open: string
	let close: string
	if(tag === 'function-definition' || tag === 'variable-definition') {
		open = '['
		close = ']'
	} else if(tag === 'function-call') {
		open = '[['
		close = ']]'
	} else if(tag === 'value') {
		open = '{{'
		close = '}}'
	} else {
		open = '(['
		close = '])'
	}
	return { open, close }
}

function printIdentifier(id: IdentifierDefinition): string {
	return `${id.name} (${id.nodeId}, ${id.kind},${id.controlDependency? ' {' + id.controlDependency.join(',') + '},' : ''} def. @${id.definedAt})`
}

function printEnvironmentToLines(env: IEnvironment | undefined): string[] {
	if(env === undefined) {
		return ['??']
	} else if(env.id === BuiltInEnvironment.id) {
		return ['Built-in']
	}
	const lines = [...printEnvironmentToLines(env.parent), `${env.id}--${env.name}${'-'.repeat(40)}`]
	const longestName = Math.max(...[...env.memory.keys()].map(x => x.length))
	for(const [name, defs] of env.memory.entries()) {
		const printName = `${name}:`
		lines.push(`  ${printName.padEnd(longestName + 1, ' ')} {${defs.map(printIdentifier).join(', ')}}`)
	}
	return lines
}

function recoverConstantName(dataflowIdMap: DataflowMap | undefined, info: DataflowGraphVertexInfo): string {
	const node = dataflowIdMap?.get(info.id)
	return node ? `[${node.type}] ${node.lexeme ?? '??'}` : '??'
}

function vertexToMermaid(info: DataflowGraphVertexInfo, mermaid: MermaidGraph, id: NodeId, idPrefix: string, dataflowIdMap: DataflowMap | undefined, mark: Set<NodeId> | undefined): void {
	const fCall = info.tag === 'function-call'
	const { open, close } = mermaidNodeBrackets(info.tag)

	if(info.environment && mermaid.includeEnvironments) {
		if(info.environment.level > 0 || info.environment.current.memory.size !== 0) {
			mermaid.nodeLines.push(
				`    %% Environment of ${id} [level: ${info.environment.level}]:`,
				printEnvironmentToLines(info.environment.current).map(x => `    %% ${x}`).join('\n'))
		}
	}
	const escapedName = escapeMarkdown(info.name === CONSTANT_NAME ? recoverConstantName(dataflowIdMap, info) : info.name)

	const deps = info.controlDependency ? ', :maybe:' + info.controlDependency.join(',') : ''
	mermaid.nodeLines.push(`    ${idPrefix}${id}${open}"\`${escapedName}${escapedName.length > 10 ? '\n      ' : ' '}(${id}${deps})\n      *${formatRange(dataflowIdMap?.get(id)?.location)}*${
		fCall ? displayFunctionArgMapping(info.args) : ''
	}\`"${close}`)
	if(mark?.has(id)) {
		mermaid.nodeLines.push(`    style ${idPrefix}${id} stroke:black,stroke-width:7px; `)
	}

	const edges = mermaid.rootGraph.get(id, true)
	guard(edges !== undefined, `node ${id} must be found`)
	const artificialCdEdges = (info.controlDependency ?? []).map(x => [x, { types: new Set(['CD']) }] as const)
	for(const [target, edge] of [...edges[1], ...artificialCdEdges]) {
		const dotEdge = edge.types.has(EdgeType.SameDefDef) || edge.types.has(EdgeType.SameReadRead) || edge.types.has(EdgeType.Relates)
		const edgeId = encodeEdge(idPrefix + id, idPrefix + target, edge.types)
		if(!mermaid.presentEdges.has(edgeId)) {
			mermaid.presentEdges.add(edgeId)
			mermaid.edgeLines.push(`    ${idPrefix}${id} ${dotEdge ? '-.-' : '-->'}|"${[...edge.types].join(', ')}"| ${idPrefix}${target}`)
			if(mermaid.mark?.has(id + '->' + target)) {
				// who invented this syntax?!
				mermaid.edgeLines.push(`    linkStyle ${mermaid.presentEdges.size - 1} stroke:red,color:red,stroke-width:4px;`)
			}
			if(edge.types.has('CD')) {
				mermaid.edgeLines.push(`    linkStyle ${mermaid.presentEdges.size - 1} stroke:gray,color:gray;`)
			}
			if(target === BuiltIn) {
				mermaid.hasBuiltIn = true
			}
		}
	}
	if(info.tag === 'function-definition') {
		subflowToMermaid(id, info.exitPoints, info.subflow, dataflowIdMap, mermaid, idPrefix)
	}
}

interface MermaidGraphConfiguration {
	graph:                DataflowGraph,
	dataflowIdMap:        DataflowMap | undefined,
	prefix?:              string | null,
	idPrefix?:            string,
	includeEnvironments?: boolean,
	mark?:                Set<Mark>,
	rootGraph?:           DataflowGraph,
	presentEdges?:        Set<string>
}


// make the passing of root ids more performant again
function graphToMermaidGraph(
	rootIds: ReadonlySet<NodeId>,
	{ graph, dataflowIdMap, prefix = 'flowchart TD', idPrefix = '', includeEnvironments = true, mark, rootGraph, presentEdges = new Set<string>() }: MermaidGraphConfiguration
): MermaidGraph {
	const mermaid: MermaidGraph = { nodeLines: prefix === null ? [] : [prefix], edgeLines: [], presentEdges, hasBuiltIn: false, mark, rootGraph: rootGraph ?? graph, includeEnvironments }

	for(const [id, info] of graph.vertices(true)) {
		if(rootIds.has(id)) {
			vertexToMermaid(info, mermaid, id, idPrefix, dataflowIdMap, mark)
		}
	}
	if(mermaid.hasBuiltIn) {
		mermaid.nodeLines.push(`    ${idPrefix}${BuiltIn}["Built-in"]`)
	}
	return mermaid
}

export function graphToMermaid(config: MermaidGraphConfiguration): { string: string, mermaid: MermaidGraph } {
	const mermaid = graphToMermaidGraph(config.graph.rootIds(), config)
	return { string: `${mermaid.nodeLines.join('\n')}\n${mermaid.edgeLines.join('\n')}`, mermaid }
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
	return mermaidCodeToUrl(graphToMermaid({ graph, dataflowIdMap, includeEnvironments, mark }).string)
}

export interface LabeledDiffGraph {
	label: string
	graph: DataflowGraph
	mark?: Set<Mark>
}

/** uses same id map but ensures, it is different from the rhs so that mermaid can work with that */
export function diffGraphsToMermaid(left: LabeledDiffGraph, right: LabeledDiffGraph, dataflowIdMap: DataflowMap | undefined, prefix: string): string {
	// we add the prefix ourselves
	const { string: leftGraph, mermaid } = graphToMermaid({ graph: left.graph, dataflowIdMap, prefix: '', idPrefix: `l-${left.label}`, includeEnvironments: true, mark: left.mark })
	const { string: rightGraph } = graphToMermaid({ graph: right.graph, dataflowIdMap, prefix: '', idPrefix: `r-${right.label}`, includeEnvironments: true, mark: right.mark, presentEdges: mermaid.presentEdges })

	return `${prefix}flowchart TD\nsubgraph "${left.label}"\n${leftGraph}\nend\nsubgraph "${right.label}"\n${rightGraph}\nend`
}

export function diffGraphsToMermaidUrl(left: LabeledDiffGraph, right: LabeledDiffGraph, dataflowIdMap: DataflowMap | undefined, prefix: string): string {
	return mermaidCodeToUrl(diffGraphsToMermaid(left, right, dataflowIdMap, prefix))
}
