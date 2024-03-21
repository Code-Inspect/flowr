/**
 * Reading the given file line by line and expecting constructs of {@link StatisticsOutputFormat},
 * this module is responsible for identifying interesting groups of same data.
 *
 * @module
 */
import LineByLine from 'n-readlines'
import type { StatisticsOutputFormat } from '../../'
import { DefaultMap } from '@eagleoutice/flowr/util/defaultmap'
import type { NodeId } from '@eagleoutice/flowr'
import { deterministicCountingIdGenerator } from '@eagleoutice/flowr'
import type { MergeableRecord } from '@eagleoutice/flowr/util/objects'

export type ContextsWithCount = DefaultMap<NodeId, number>
export type ClusterContextIdMap = DefaultMap<string | undefined, NodeId>
export type ClusterValueInfoMap = DefaultMap<string, ContextsWithCount>

/** Produced by {@link clusterStatisticsOutput} */
export interface ClusterReport extends MergeableRecord {
	/** The input file which has been clustered */
	readonly filepath: string
	/** Maps each context encountered (i.e., every file which contains something associated with the feature) to a unique id, used in the {@link ClusterReport#valueInfoMap | valueInfoMap}. */
	contextIdMap:      ClusterContextIdMap
	/**
   * Counts which contexts contained which values of a feature.
   * For example, that `<-` occurred in files with ids `[12, 42, 19, 19]` (i.e., the context with the id 19 contained it twice).
   */
	valueInfoMap:      ClusterValueInfoMap
}

/**
 * Takes a statistics file like `statistics-out/top-2023-01-01-00-00-00/Assignments/assignmentOperator.txt` and clusters the values by context
 *
 * @param filepath     - Filepath of the statistics file
 * @param contextIdMap - The id map to use, can use an existing one to reuse ids for same contexts spreading over multiple input files.
 *  `undefined` is used for unknown contexts. This map allows us to reference contexts with a way shorter identifier (vs. the full file path).
 */
export function clusterStatisticsOutput(filepath: string, contextIdMap: ClusterContextIdMap = new DefaultMap<string | undefined, NodeId>(deterministicCountingIdGenerator())): ClusterReport {
	const lineReader = new LineByLine(filepath)

	// for each value we store the context ids it was seen in (may list the same context multiple times if more often) - this serves as a counter as well
	const valueInfoMap: ClusterValueInfoMap = new DefaultMap<string, ContextsWithCount>(() => new DefaultMap(() => 0))
	let line

	// eslint-disable-next-line no-cond-assign
	while(line = lineReader.next()) {
		const json = JSON.parse(line.toString()) as StatisticsOutputFormat
		const contextId = contextIdMap.get(json[1])

		const value = valueInfoMap.get(json[0])
		// step the counter accordingly
		value.set(contextId, value.get(contextId) + 1)
	}

	return {
		filepath,
		contextIdMap,
		valueInfoMap
	}
}
