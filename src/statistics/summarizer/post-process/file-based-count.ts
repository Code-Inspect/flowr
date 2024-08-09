import type { ClusterReport } from './clusterer'
import fs from 'fs'

export interface FileBasedTable {
	header: string[]
	rows:   string[][]
}

/**
 * The purpose of this function is to reformat {@link ClusterReport} in way that lists file-based contributions.
 * E.g., "the file with id 12 contained the assignment with `<-` 3 times".
 * Feature Values are listed in the header.
 *
 * @param report - the report to reformat
 */
export function fileBasedCount(report: ClusterReport): FileBasedTable {
	const values = report.valueInfoMap
	const contexts = [...report.valueInfoMap.values()]

	const header = [...values.keys()].map(k => `"${k}"`)
	const rows: string[][] = []
	for(const id of report.contextIdMap.values()) {
		rows.push(contexts.map(c => `${c.get(id)}`))
	}

	return {
		header: header,
		rows:   rows
	}
}

/**
 * The threshold will cap of values larger to the threshold.
 */
export function writeFileBasedCountToFile(table: FileBasedTable, filepath: string): void {
	const handle = fs.openSync(filepath, 'w')
	const header = table.header.join('\t')
	fs.writeSync(handle, `${header}\n`)

	let max = 0

	function processEntry(r: string) {
		const val = Number(r)
		max = Math.max(val, max)
		return r
	}

	for(const row of table.rows) {
		fs.writeSync(handle, row.map(processEntry).join('\t') + '\n')
	}

	fs.writeSync(handle, `%%% max: ${max}\n`)
	fs.closeSync(handle)
}
