import path from 'path'
import fs from 'fs'
import type { ClusterContextIdMap, ClusterReport } from './clusterer'
import { clusterStatisticsOutput } from './clusterer'
import { log } from '../../../util/log'
import { DefaultMap } from '../../../util/defaultmap'
import { ColorEffect, Colors, FontStyles, formatter } from '../../../util/ansi'
import type { FeatureKey, FeatureSelection } from '../../features/feature'
import { ALL_FEATURES } from '../../features/feature'
import { deterministicCountingIdGenerator } from '../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { NodeId } from '../../../r-bridge/lang-4.x/ast/model/processing/node-id'
import { defaultStatisticsFileSuffix } from '../../output/file-provider'

/**
 * Post process the collections in a given folder, reducing them in a memory preserving way.
 *
 * @param filepath - Path to the root file of the data collection like `statistics-out/top-2023-01-01-00-00-00/`
 * @param features - Collection of features to post process, expects corresponding folders to exist
 *
 * @returns non-aggregated reports for each sub-key of each feature
 */
export function postProcessFeatureFolder(filepath: string, features: FeatureSelection): ClusterReport[] {
	if(!fs.existsSync(filepath)) {
		log.warn(`Folder for ${filepath} does not exist, skipping post processing`)
		return []
	}

	const results: ClusterReport[] = []
	for(const feature of features) {
		const result = processFeatureFolder(filepath, feature)
		if(result.length > 0) {
			results.push(...result)
		}
	}
	return results
}

/**
 * Process a single feature folder like `Assignments/`
 *
 * @param filepath - Same as the input to {@link postProcessFeatureFolder}
 * @param feature  - The (single) feature to process
 */
function processFeatureFolder(filepath: string, feature: FeatureKey): ClusterReport[] {
	const featureInfo = ALL_FEATURES[feature]
	const targetPath = path.join(filepath, featureInfo.name)

	if(!fs.existsSync(targetPath)) {
		log.warn(`Folder for ${feature} does not exist at ${targetPath} skipping post processing of this feature`)
		return []
	}
	log.info(`Processing ${feature} at ${targetPath}`)

	const contextIdMap: ClusterContextIdMap = new DefaultMap<string | undefined, NodeId>(deterministicCountingIdGenerator())

	const featureSubKeys = Object.keys(featureInfo.initialValue)
	const reports: ClusterReport[] = []
	for(const subKey of featureSubKeys) {
		const value = processFeatureSubKey(targetPath, subKey, contextIdMap)
		if(value !== undefined) {
			reports.push(value)
		}
	}
	return reports
}

function processFeatureSubKey(featurePath: string, subKey: string, contextIdMap: ClusterContextIdMap): undefined | ClusterReport {
	const targetPath = path.join(featurePath, `${subKey}${defaultStatisticsFileSuffix}`)

	if(!fs.existsSync(targetPath)) {
		log.warn(`Folder for ${subKey} does not exist at ${targetPath} skipping post processing of this key`)
		return undefined
	}

	return clusterStatisticsOutput(targetPath, contextIdMap)
}

/**
 * Prints the report to the console, but limits the output to the `limit` entries with the highest counts.
 * The names of these entries (like `->`) are returned, so they can be used to filter the following histograms.
 */
export function printClusterReport(report: ClusterReport, limit = 1000): string[] {
	console.log('\n\n\n')
	console.log(report.filepath)

	const shortStats = [...report.valueInfoMap.entries()].map(([name, values]) => {
		return {
			name,
			count:  [...values.values()].reduce((a, b) => a + b, 0),
			unique: values.size()
		}
	}).sort((a, b) => b.count - a.count).slice(0, limit)

	const { longestName, longestCount, longestUnique } = shortStats.reduce((acc, { name, count, unique }) => {
		return {
			longestName:   Math.max(acc.longestName, name.length),
			longestCount:  Math.max(acc.longestCount, count.toLocaleString().length),
			longestUnique: Math.max(acc.longestUnique, unique.toLocaleString().length),
		}
	}, { longestName: 0, longestCount: 0, longestUnique: 0 })


	for(const { name, count, unique } of shortStats) {
		const strId = `${name}`.padEnd(longestName, ' ')
		const strCount = count.toLocaleString().padStart(longestCount, ' ')
		const strUnique = unique.toLocaleString().padStart(longestUnique, ' ')
		const uniqueSuffix = `\t (${strUnique} ${formatter.format('unique', { color: Colors.White, effect: ColorEffect.Foreground })})`
		console.log(`\t${formatter.format(strId, { style: FontStyles.Bold })}\t ${strCount} ` +
      `${formatter.format('total', { color: Colors.White, effect: ColorEffect.Foreground })}`
      + (count !== unique ? uniqueSuffix : '')
		)
	}
	return shortStats.map(({ name }) => name)
}
