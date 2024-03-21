import type { FeatureKey, FeatureStatistics } from '../features'
import { ALL_FEATURES } from '../features'
import { ColorEffect, Colors, formatter } from '@eagleoutice/flowr/util/ansi'
import type { MetaStatistics } from '../meta-statistics'
import { jsonReplacer } from '@eagleoutice/flowr/util/json'

interface MinMaxAvgMedian { sum: number, min: number, max: number, avg: number, median: number}

export function minMaxAvgAndMedian(data: number[]): MinMaxAvgMedian {
	data  = data.sort((a, b) => a - b)
	const sum = data.reduce((a, b) => a + b, 0)
	return {
		sum,
		min:    data[0],
		max:    data[data.length - 1],
		avg:    sum / data.length,
		median: data[Math.floor(data.length / 2)]
	}
}

function formatStatNumber(num: number | undefined): string {
	return num === undefined ? '<?>' : Number(num.toFixed(3)).toLocaleString()
}

export function statsString(data: MinMaxAvgMedian, suffix = ''): string {
	return `[${formatStatNumber(data.min)}${suffix} .. ${formatStatNumber(data.max)}${suffix}] (avg: ${formatStatNumber(data.avg)}${suffix}, median: ${formatStatNumber(data.median)}${suffix})`
}



export function printFeatureStatistics(statistics: {features: FeatureStatistics, meta: MetaStatistics}, features: 'all' | Set<FeatureKey> = 'all'): void {
	for(const feature of Object.keys(statistics.features) as FeatureKey[]) {
		if(features !== 'all' && !features.has(feature)) {
			continue
		}
		const meta = ALL_FEATURES[feature]
		console.log(`\n\n-----${meta.name}-------------`)
		console.log(formatter.format(meta.description, { color: Colors.White, effect: ColorEffect.Foreground }))
		printFeatureStatisticsEntry(statistics.features[feature])
		console.log('\n\n')
	}

	const linesPerFile = minMaxAvgAndMedian(statistics.meta.lines.map(l => l.length))
	const lineLengths = minMaxAvgAndMedian(statistics.meta.lines.flat())
	const processingTimesPerFile = minMaxAvgAndMedian(statistics.meta.processingTimeMs)

	console.log(`processed ${statistics.meta.successfulParsed} files (skipped ${statistics.meta.failedRequests.length} due to errors):
\ttotal processing time: ${processingTimesPerFile.sum} ms
\t\tprocessing time range: ${statsString(processingTimesPerFile, ' ms')}
\ttotal number of lines: ${lineLengths.sum}
\t\tline range: ${statsString(linesPerFile)}
\t\tline length range: ${statsString(lineLengths,' chars')}
  `)
}

const pad = 3

export function printFeatureStatisticsEntry(info: Record<string, unknown>): void {
	let longestKey = 0
	let longestValue = 0
	const out = new Map<string, string>()
	for(const [key, value] of Object.entries(info)) {
		if(key.length > longestKey) {
			longestKey = key.length
		}
		const valueString = JSON.stringify(value, jsonReplacer)
		out.set(key, valueString)
		if(valueString.length > longestValue) {
			longestValue = valueString.length
		}
	}
	for(const [key, value] of out.entries()) {
		console.log(`${key.padEnd(longestKey + pad)} ${value.padStart(longestValue)}`)
	}
}
