import type { MergeableRecord } from '@eagleoutice/flowr/util/objects'
import type { UltimateSlicerStats } from '../data'
import fs from 'fs'
import { jsonReplacer } from '@eagleoutice/flowr/util/json'

interface BenchmarkGraphEntry extends MergeableRecord {
	name:   string,
	unit:   string,
	value:  number,
	range?: number,
	extra?: string
}

export function writeGraphOutput(ultimate: UltimateSlicerStats, outputGraphPath: string) {
	console.log(`Producing benchmark graph data (${outputGraphPath})...`)

	const data: BenchmarkGraphEntry[] = []

	for(const { name, measurements } of [{ name: 'per-file', measurements: ultimate.commonMeasurements }, { name: 'per-slice', measurements: ultimate.perSliceMeasurements }]) {
		for(const [point, measurement] of measurements) {
			if(point === 'close R session' || point === 'initialize R session') {
				continue
			}
			const pointName = point === 'total'? `total ${name}` : point
			data.push({
				name:  pointName[0].toUpperCase() + pointName.slice(1),
				unit:  'ms',
				value: Number(measurement.mean / 1e6),
				range: Number(measurement.std / 1e6),
				extra: `median: ${(measurement.median / 1e6).toFixed(2)}ms`
			})
		}
	}
	data.push({
		name:  'failed to reconstruct/re-parse',
		unit:  '#',
		value: ultimate.failedToRepParse,
		extra: `out of ${ultimate.totalSlices} slices`
	})
	data.push({
		name:  'times hit threshold',
		unit:  '#',
		value: ultimate.timesHitThreshold
	})
	data.push({
		name:  'reduction (characters)',
		unit:  '#',
		value: ultimate.reduction.numberOfCharacters.mean,
		extra: `std: ${ultimate.reduction.numberOfCharacters.std}`
	})
	data.push({
		name:  'reduction (normalized tokens)',
		unit:  '#',
		value: ultimate.reduction.numberOfNormalizedTokens.mean,
		extra: `std: ${ultimate.reduction.numberOfNormalizedTokens.std}`
	})


	// write the output file
	fs.writeFileSync(outputGraphPath, JSON.stringify(data, jsonReplacer))
}
