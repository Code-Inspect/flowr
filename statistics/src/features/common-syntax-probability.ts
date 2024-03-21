/**
 * Defines the type of syntax constructs that we track (e.g., true, false, 0, 1, T, F, conditions...)
 */
import type { RNodeWithParent } from '@eagleoutice/flowr/r-bridge'
import { RFalse, RTrue, RType } from '@eagleoutice/flowr/r-bridge'
import { bigint2number } from '@eagleoutice/flowr/util/numbers'
import type { SummarizedMeasurement } from '@eagleoutice/flowr/util/summarizer'
import { summarizeMeasurement } from '@eagleoutice/flowr/util/summarizer'

export interface CommonSyntaxTypeCounts<Measurement=bigint> {
	// just a helper to collect all as well (could be derived from sum)
	total:        Measurement,
	// counts whenever you pass more than one node that is not sensible for any other category
	multiple:     Measurement,
	// similar to multiple, but only counts empty (bodies etc.)
	empty:        Measurement,
	// in case of a = x etc.
	withArgument: Measurement,
	// arguments used without value
	noValue:      Measurement,
	// does include t and f, as well as NULL etc. (any special symbol)
	singleVar:    Record<string, Measurement>
	number:       Record<number, Measurement>
	// only explicit integers
	integer:      Record<number, Measurement>
	complex:      Record<number, Measurement>
	string:       Record<string, Measurement>
	logical:      Record<typeof RTrue | typeof RFalse, Measurement>,
	call:         Record<string, Measurement>,
	unnamedCall:  Measurement,
	// binop includes all assignments!
	binOp:        Record<string, Measurement>,
	unaryOp:      Record<string, Measurement>,
	// unknown content, records lexeme (can include break etc. for bodies), due to my oversight, this includes function definitions
	other:        Record<string, Measurement>
}

export function emptyCommonSyntaxTypeCounts<T=bigint>(init: () => T = () => 0n as T): CommonSyntaxTypeCounts<T> {
	return {
		total:        init(),
		multiple:     init(),
		empty:        init(),
		withArgument: init(),
		noValue:      init(),
		singleVar:    {},
		number:       {},
		integer:      {},
		complex:      {},
		string:       {},
		logical:      {} as Record<typeof RTrue | typeof RFalse, T>,
		call:         {},
		unnamedCall:  init(),
		binOp:        {},
		unaryOp:      {},
		other:        {}
	}
}


function incrementEntry<T extends string | number | symbol>(map: Record<T, bigint>, key: T): void {
	map[key] = ((map[key] as bigint | undefined) ?? 0n) + 1n
}

/**
 * Updates the given counts based on the type of the given node.
 */
export function updateCommonSyntaxTypeCounts(current: CommonSyntaxTypeCounts, ...nodes: RNodeWithParent[]): CommonSyntaxTypeCounts {
	current.total++
	if(nodes.length === 0) {
		current.empty++
		return current
	} else if(nodes.length > 1) {
		current.multiple++
		return current
	}

	let node = nodes[0]
	if(node.type === RType.Argument) {
		if(node.name !== undefined) {
			current.withArgument++
		}
		if(node.value !== undefined) {
			node = node.value
		} else {
			current.noValue++
			return current
		}
	}
	switch(node.type) {
		case RType.String:
			incrementEntry(current.string, node.content.str)
			break
		case RType.Symbol:
			incrementEntry(current.singleVar, node.content)
			break
		case RType.Logical:
			incrementEntry(current.logical, node.content ? RTrue : RFalse)
			break
		case RType.Number:
			if(node.content.complexNumber) {
				incrementEntry(current.complex, node.content.num)
			} else if(node.content.markedAsInt) {
				incrementEntry(current.integer, node.content.num)
			} else {
				incrementEntry(current.number, node.content.num)
			}
			break
		case RType.FunctionCall:
			if(node.flavor === 'unnamed') {
				current.unnamedCall++
			} else {
				incrementEntry(current.call, node.functionName.content)
			}
			break
		case RType.BinaryOp:
			incrementEntry(current.binOp, node.operator)
			break
		case RType.UnaryOp:
			incrementEntry(current.unaryOp, node.operator)
			break
		default:
			// for space reasons we do not record the full lexeme!
			if(node.lexeme) {
				incrementEntry(current.other, node.lexeme)
			}
			break
	}

	return current
}



function appendRecord(a: Record<string, number[][] | undefined>, b: Record<string, bigint>): void {
	for(const [key, val] of Object.entries(b)) {
		const get = a[key]
		// we guard with array to guard against methods like `toString` which are given in js
		if(!get || !Array.isArray(get)) {
			a[key] = [[bigint2number(val)]]
			continue
		}
		get.push([bigint2number(val)])
	}
}

export function appendCommonSyntaxTypeCounter(a: CommonSyntaxTypeCounts<number[][]>, b: CommonSyntaxTypeCounts) {
	a.total.push([bigint2number(b.total)])
	a.empty.push([bigint2number(b.empty)])
	a.multiple.push([bigint2number(b.multiple)])
	a.withArgument.push([bigint2number(b.withArgument)])
	a.noValue.push([bigint2number(b.noValue)])
	a.unnamedCall.push([bigint2number(b.unnamedCall)])
	appendRecord(a.singleVar, b.singleVar)
	appendRecord(a.number, b.number)
	appendRecord(a.integer, b.integer)
	appendRecord(a.complex, b.complex)
	appendRecord(a.string, b.string)
	appendRecord(a.logical, b.logical)
	appendRecord(a.call, b.call)
	appendRecord(a.binOp, b.binOp)
	appendRecord(a.unaryOp, b.unaryOp)
	appendRecord(a.other, b.other)
}


function summarizeRecord(a: Record<string, number[][]>): Record<string, SummarizedMeasurement> {
	return Object.fromEntries(Object.entries(a).map(([key, val]) => [key, summarizeMeasurement(val.flat(), val.length)]))
}

export function summarizeCommonSyntaxTypeCounter(a: CommonSyntaxTypeCounts<number[][]>): CommonSyntaxTypeCounts<SummarizedMeasurement> {
	return {
		total:        summarizeMeasurement(a.total.flat(), a.total.length),
		empty:        summarizeMeasurement(a.empty.flat(), a.empty.length),
		multiple:     summarizeMeasurement(a.multiple.flat(), a.multiple.length),
		withArgument: summarizeMeasurement(a.withArgument.flat(), a.withArgument.length),
		noValue:      summarizeMeasurement(a.noValue.flat(), a.noValue.length),
		unnamedCall:  summarizeMeasurement(a.unnamedCall.flat(), a.unnamedCall.length),
		singleVar:    summarizeRecord(a.singleVar),
		number:       summarizeRecord(a.number),
		integer:      summarizeRecord(a.integer),
		complex:      summarizeRecord(a.complex),
		string:       summarizeRecord(a.string),
		logical:      summarizeRecord(a.logical),
		call:         summarizeRecord(a.call),
		binOp:        summarizeRecord(a.binOp),
		unaryOp:      summarizeRecord(a.unaryOp),
		other:        summarizeRecord(a.other)
	}
}
