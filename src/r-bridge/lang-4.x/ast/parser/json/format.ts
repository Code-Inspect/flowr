import { removeTokenMapQuotationMarks } from '../../../../retriever'
import { guard } from '../../../../../util/assert'

export const RootId = 0

export interface Entry extends Record<string, unknown> {
	line1:     number,
	col1:      number,
	line2:     number,
	col2:      number,
	id:        number,
	parent:    number,
	token:     string,
	terminal:  boolean,
	text:      string,
	children?: Entry[]
}

type ParsedDataRow = [line1: number, col1: number, line2: number, col2: number, id: number, parent: number, token: string, terminal: boolean, text: string]

/**
 * Parses the given data and sets child relationship, return the list of root entries (with a parent of {@link RootId}).
 */
export function prepareParsedData(data: string): Entry[] {
	console.log(data)
	/* we add a trailing null to the json to avoid a trailing comma */
	const json: unknown = JSON.parse(`[${data}null]`)
	guard(Array.isArray(json), () => `Expected ${data} to be an array but was not`)

	const ret = new Map<number, Entry>((json as ParsedDataRow[]).slice(0,-1).map(([line1, col1, line2, col2, id, parent, token, terminal, text]) => {
		return [id, { line1, col1, line2, col2, id, parent, token: removeTokenMapQuotationMarks(token), terminal, text }] satisfies [number, Entry]
	}))

	const roots: Entry[] = []

	// iterate a second time to set parent-child relations (since they may be out of order in the csv)
	for(const entry of ret.values()) {
		if(entry.parent != RootId) {
			const parent = ret.get(entry.parent)
			if(parent) {
				parent.children ??= []
				parent.children.push(entry)
			}
		} else {
			roots.push(entry)
		}
	}

	return roots
}
