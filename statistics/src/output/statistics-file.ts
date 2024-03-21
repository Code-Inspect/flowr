import type {
	DummyAppendMemoryMap,
	StatisticAppendProvider } from './file-provider'
import {
	DummyAppendProvider,
	StatisticFileProvider
} from './file-provider'
import { log } from '@eagleoutice/flowr/util/log'


/**
 * Requires source information to be attached on parsing!
 * <p>
 * Returns the content of the node (i.e., the text content excluding the children)
 */
export function extractNodeContent(node: Node): string {
	let result = node.textContent

	if(node.hasChildNodes()) {
		const firstChild = node.childNodes.item(0)
		if(firstChild.nodeType === 3 /* text node */) {
			result = firstChild.textContent
		}
	}

	return result?.trim()?.replaceAll('\n', '\\n') ?? '<unknown>'
}


/** by default, we do not write to anything */
export let statisticsFileProvider: StatisticAppendProvider
initDummyFileProvider()

/**
 * Make the statistics write to a given output directory.
 */
export function initFileProvider(outputDirectory: string): void {
	log.debug(`Initializing file provider for output directory ${outputDirectory}`)
	statisticsFileProvider = new StatisticFileProvider(outputDirectory)
}

/**
 * Either ignore the statistics or write them to a given map (e.g., for testing).
 *
 * @param map - The map to write to, will not persist calls if no map is given
 */
export function initDummyFileProvider(map?: DummyAppendMemoryMap): void {
	statisticsFileProvider = new DummyAppendProvider(map)
}

/**
 * Format used to dump each entry of a feature during collection.
 */
export type StatisticsOutputFormat<T=string> = [
		/** the collected value (like the assignment operator lexeme, ...) */
		value:   T,
		/** the context of the information retrieval (e.g. the name of the file that contained the R source code) */
		context: string | undefined
]

/**
 * Append the content of all nodes to the storage file for the given feature
 * @param name    - The name of the feature {@link Feature#name}
 * @param fn      - The name of the feature-aspect to record
 * @param nodes   - The nodes to append, you may pass already transformed string contents
 * @param context - The context of the information retrieval (e.g. the name of the file that contained the R source code)
 * @param unique  - Should duplicate entries be removed on addition
 */
export function appendStatisticsFile<T>(name: string, fn: keyof T, nodes: string[] | Node[] | object[], context: string | undefined, unique = false) {
	if(nodes.length === 0) {
		return
	}
	let values

	if(typeof nodes[0] === 'string') {
		values = nodes
	} else if('nodeType' in nodes[0]) {
		values = (nodes as Node[]).map(extractNodeContent)
	} else {
		values = nodes
	}


	if(unique) {
		values = [...new Set<string | object | Node>(values)]
	}

	values = values.map(value => JSON.stringify(context === undefined ? [value] : [value, context] as StatisticsOutputFormat))

	statisticsFileProvider.append(name, fn, values.join('\n'))
}
