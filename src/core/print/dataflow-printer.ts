import { jsonReplacer } from '../../util/json'
import type { DataflowInformation } from '../../dataflow/info'
import type { QuadSerializationConfiguration } from '../../util/quads'
import { df2quads } from '../../dataflow/graph/quads'
import { graphToMermaid, graphToMermaidUrl } from '../../util/mermaid'
import type { DataflowMap } from '../../dataflow'


function mayObjectJson(d: unknown): string {
	if(typeof d === 'object') {
		return objectJson(d as object)
	} else {
		return JSON.stringify(d, jsonReplacer)
	}
}

function objectJson(df: object): string {
	const elems: [string, string][] = []

	for(const [key, value] of Object.entries(df)) {
		switch(typeof value) {
			case 'undefined':
			case 'function':
				continue
			case 'object':
				if(Array.isArray(value)) {
					elems.push([key, `[${value.map(x => mayObjectJson(x)).join(',')}]`])
				} else if(value instanceof Set) {
					elems.push([key, `[${[...value].map(x => mayObjectJson(x)).join(',')}]`])
				} else if(value instanceof Map) {
					elems.push([key, `[${[...value].map(([k, v]) => `[${mayObjectJson(k)},${mayObjectJson(v)}]`).join(',')}]`])
				} else {
					elems.push([key, objectJson(value as object)])
				}
				break
			case 'bigint':
				elems.push([key, `${value.toString()}n`])
				break
			default:
				elems.push([key, JSON.stringify(value, jsonReplacer)])
		}
	}

	return `{${elems.map(([key, value]) => `"${key}":${value}`).join(',')}}`
}

/** Should work with larger things as well */
export function dataflowGraphToJson(df: DataflowInformation): string {
	return objectJson(df)
}

export function dataflowGraphToMermaid(df: DataflowInformation, idMap: DataflowMap): string {
	return graphToMermaid({ graph: df.graph, dataflowIdMap: idMap }).string
}

export function dataflowGraphToMermaidUrl(df: DataflowInformation, idMap: DataflowMap): string {
	return graphToMermaidUrl(df.graph, idMap)
}

export function dataflowGraphToQuads(df: DataflowInformation, config: QuadSerializationConfiguration): string {
	return df2quads(df.graph, config)
}
