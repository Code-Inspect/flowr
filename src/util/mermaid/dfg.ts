import type { SourceRange } from '../range'


import { guard } from '../assert'
import { escapeMarkdown, mermaidCodeToUrl } from './mermaid'
import type { DataflowFunctionFlowInformation, DataflowGraph, FunctionArgument } from '../../dataflow/graph/graph'
import { isNamedArgument, isPositionalArgument } from '../../dataflow/graph/graph'
import type { NodeId } from '../../r-bridge/lang-4.x/ast/model/processing/node-id'
import type { IdentifierDefinition, IdentifierReference } from '../../dataflow/environments/identifier'
import { EmptyArgument } from '../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { EdgeType } from '../../dataflow/graph/edge'
import { edgeTypeToName, splitEdgeTypes } from '../../dataflow/graph/edge'
import type { DataflowGraphVertexInfo } from '../../dataflow/graph/vertex'
import { VertexType } from '../../dataflow/graph/vertex'
import type { IEnvironment } from '../../dataflow/environments/environment'
import { BuiltInEnvironment } from '../../dataflow/environments/environment'
import { RType } from '../../r-bridge/lang-4.x/ast/model/type'


type MarkVertex = NodeId
type MarkEdge = `${string}->${string}`

type Mark = MarkVertex | MarkEdge

interface MermaidGraph {
	nodeLines:           string[]
	edgeLines:           string[]
	includeEnvironments: boolean
	mark:                ReadonlySet<Mark> | undefined
	/** in the form of from-\>to because I am lazy, see {@link encodeEdge} */
	presentEdges:        Set<string>
	// keep for sub-flows
	rootGraph:           DataflowGraph
}

export function formatRange(range: SourceRange | undefined): string {
	if(range === undefined) {
		return '??-??'
	} else if(range[0] === range[2]) {
		if(range[1] === range[3]) {
			return `${range[0]}.${range[1]}`
		} else {
			return `${range[0]}.${range[1]}-${range[3]}`
		}
	}
	return `${range[0]}.${range[1]}-${range[2]}.${range[3]}`
}

function subflowToMermaid(nodeId: NodeId, exitPoints: readonly NodeId[], subflow: DataflowFunctionFlowInformation | undefined, mermaid: MermaidGraph, idPrefix = ''): void {
	if(subflow === undefined) {
		return
	}
	const subflowId = `${idPrefix}flow-${nodeId}`
	mermaid.nodeLines.push(`\nsubgraph "${subflowId}" [function ${nodeId}]`)
	const subgraph = graphToMermaidGraph(subflow.graph, {
		graph:               mermaid.rootGraph,
		rootGraph:           mermaid.rootGraph,
		idPrefix,
		includeEnvironments: mermaid.includeEnvironments,
		mark:                mermaid.mark,
		prefix:              null
	})
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

	mermaid.nodeLines.push('end')
	mermaid.edgeLines.push(`${idPrefix}${nodeId} -.-|function| ${subflowId}\n`)
}


function printArg(arg: FunctionArgument | undefined): string {
	if(arg === undefined) {
		return '??'
	} else if(arg === EmptyArgument) {
		return '[empty]'
	} else if(isNamedArgument(arg)) {
		const deps = arg.controlDependencies ? ', :may:' + arg.controlDependencies.map(c => c.id + (c.when ? '+' : '-')).join(',') : ''
		return `${arg.name} (${arg.nodeId}${deps})`
	} else if(isPositionalArgument(arg)) {
		const deps = arg.controlDependencies ? ' (:may:' + arg.controlDependencies.map(c => c.id + (c.when ? '+' : '-')).join(',') + ')': ''
		return `${arg.nodeId}${deps}`
	} else {
		return '??'
	}
}
function displayFunctionArgMapping(argMapping: readonly FunctionArgument[]): string {
	const result = []
	for(const arg of argMapping) {
		result.push(printArg(arg))
	}
	return result.length === 0 ? '' : `\n    (${result.join(', ')})`
}
function encodeEdge(from: string, to: string, types: Set<EdgeType | 'CD-True' | 'CD-False'>): string {
	return `${from}->${to}["${[...types].join(':')}"]`
}


function mermaidNodeBrackets(tag: DataflowGraphVertexInfo['tag']): { open: string, close: string } {
	let open: string
	let close: string
	if(tag === 'function-definition' || tag === 'variable-definition') {
		open = '['
		close = ']'
	} else if(tag === VertexType.FunctionCall) {
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
	return `${id.name} (${id.nodeId}, ${id.kind},${id.controlDependencies? ' {' + id.controlDependencies.map(c => c.id + (c.when ? '+' : '-')).join(',') + '},' : ''} def. @${id.definedAt})`
}

function printEnvironmentToLines(env: IEnvironment | undefined): string[] {
	if(env === undefined) {
		return ['??']
	} else if(env.id === BuiltInEnvironment.id) {
		return ['Built-in']
	}
	const lines = [...printEnvironmentToLines(env.parent), `${env.id}${'-'.repeat(40)}`]
	const longestName = Math.max(...[...env.memory.keys()].map(x => x.length))
	for(const [name, defs] of env.memory.entries()) {
		const printName = `${name}:`
		lines.push(`  ${printName.padEnd(longestName + 1, ' ')} {${defs.map(printIdentifier).join(', ')}}`)
	}
	return lines
}

function vertexToMermaid(info: DataflowGraphVertexInfo, mermaid: MermaidGraph, id: NodeId, idPrefix: string, mark: ReadonlySet<NodeId> | undefined): void {
	const fCall = info.tag === VertexType.FunctionCall
	const { open, close } = mermaidNodeBrackets(info.tag)

	if(info.environment && mermaid.includeEnvironments) {
		if(info.environment.level > 0 || info.environment.current.memory.size !== 0) {
			mermaid.nodeLines.push(
				`    %% Environment of ${id} [level: ${info.environment.level}]:`,
				printEnvironmentToLines(info.environment.current).map(x => `    %% ${x}`).join('\n'))
		}
	}

	const node = mermaid.rootGraph.idMap?.get(info.id)
	const lexeme = node?.lexeme ?? (node?.type === RType.ExpressionList ? node?.grouping?.[0]?.lexeme : '') ?? '??'
	const escapedName = escapeMarkdown(node ? `[${node.type}] ${lexeme}` : '??')

	const deps = info.controlDependencies ? ', :may:' + info.controlDependencies.map(c => c.id + (c.when ? '+' : '-')).join(',') : ''
	const n = node?.info.fullRange ?? node?.location ?? (node?.type === RType.ExpressionList ? node?.grouping?.[0].location : undefined)
	mermaid.nodeLines.push(`    ${idPrefix}${id}${open}"\`${escapedName}${escapedName.length > 10 ? '\n      ' : ' '}(${id}${deps})\n      *${formatRange(n)}*${
		fCall ? displayFunctionArgMapping(info.args) : ''
	}\`"${close}`)
	if(mark?.has(id)) {
		mermaid.nodeLines.push(`    style ${idPrefix}${id} stroke:black,stroke-width:7px; `)
	}

	const edges = mermaid.rootGraph.get(id, true)
	guard(edges !== undefined, `node ${id} must be found`)
	const artificialCdEdges = (info.controlDependencies ?? []).map(x => [x.id, { types: new Set<EdgeType | 'CD-True' | 'CD-False'>([x.when ? 'CD-True' : 'CD-False']) }] as const)
	for(const [target, edge] of [...edges[1], ...artificialCdEdges]) {
		const edgeTypes = typeof edge.types == 'number' ? new Set(splitEdgeTypes(edge.types)) : edge.types
		const edgeId = encodeEdge(idPrefix + id, idPrefix + target, edgeTypes)
		if(!mermaid.presentEdges.has(edgeId)) {
			mermaid.presentEdges.add(edgeId)
			mermaid.edgeLines.push(`    ${idPrefix}${id} -->|"${[...edgeTypes].map(e => typeof e === 'number' ? edgeTypeToName(e) : e).join(', ')}"| ${idPrefix}${target}`)
			if(mermaid.mark?.has(id + '->' + target)) {
				// who invented this syntax?!
				mermaid.edgeLines.push(`    linkStyle ${mermaid.presentEdges.size - 1} stroke:red,color:red,stroke-width:4px;`)
			}
			if(edgeTypes.has('CD-True')) {
				mermaid.edgeLines.push(`    linkStyle ${mermaid.presentEdges.size - 1} stroke:gray,color:gray;`)
			}
		}
	}
	if(info.tag === 'function-definition') {
		subflowToMermaid(id, info.exitPoints, info.subflow, mermaid, idPrefix)
	}
}

interface MermaidGraphConfiguration {
	graph:                DataflowGraph,
	prefix?:              string | null,
	idPrefix?:            string,
	includeEnvironments?: boolean,
	mark?:                ReadonlySet<Mark>,
	rootGraph?:           DataflowGraph,
	presentEdges?:        Set<string>
}


// make the passing of root ids more performant again
function graphToMermaidGraph(
	rootIds: ReadonlySet<NodeId>,
	{ graph, prefix = 'flowchart TD', idPrefix = '', includeEnvironments = true, mark, rootGraph, presentEdges = new Set<string>() }: MermaidGraphConfiguration
): MermaidGraph {
	const mermaid: MermaidGraph = { nodeLines: prefix === null ? [] : [prefix], edgeLines: [], presentEdges, mark, rootGraph: rootGraph ?? graph, includeEnvironments }

	for(const [id, info] of graph.vertices(true)) {
		if(rootIds.has(id)) {
			vertexToMermaid(info, mermaid, id, idPrefix, mark)
		}
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
 * @param includeEnvironments - Whether to include the environments in the mermaid graph code
 * @param mark          - Special nodes to mark (e.g., those included in the slice)
 */
export function graphToMermaidUrl(graph: DataflowGraph, includeEnvironments?: boolean, mark?: ReadonlySet<NodeId>): string {
	return mermaidCodeToUrl(graphToMermaid({ graph, includeEnvironments, mark }).string)
}

export interface LabeledDiffGraph {
	label: string
	graph: DataflowGraph
	mark?: Set<Mark>
}

/** uses same id map but ensures, it is different from the rhs so that mermaid can work with that */
export function diffGraphsToMermaid(left: LabeledDiffGraph, right: LabeledDiffGraph, prefix: string): string {
	// we add the prefix ourselves
	const { string: leftGraph, mermaid } = graphToMermaid({ graph: left.graph, prefix: '', idPrefix: `l-${left.label}`, includeEnvironments: true, mark: left.mark })
	const { string: rightGraph } = graphToMermaid({ graph: right.graph, prefix: '', idPrefix: `r-${right.label}`, includeEnvironments: true, mark: right.mark, presentEdges: mermaid.presentEdges })

	return `${prefix}flowchart TD\nsubgraph "${left.label}"\n${leftGraph}\nend\nsubgraph "${right.label}"\n${rightGraph}\nend`
}

export function diffGraphsToMermaidUrl(left: LabeledDiffGraph, right: LabeledDiffGraph, prefix: string): string {
	return mermaidCodeToUrl(diffGraphsToMermaid(left, right, prefix))
}
