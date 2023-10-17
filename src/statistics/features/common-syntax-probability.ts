/**
 * Defines the type of syntax constructs that we track (e.g., true, false, 0, 1, T, F, conditions...)
 */
import { RFalse, RNodeWithParent, RTrue, RType } from '../../r-bridge'

export interface CommonSyntaxTypeCounts {
	// just a helper to collect all as well (could be derived from sum)
	total:       bigint,
	// does include t and f, as well as NULL etc. (any special symbol)
	singleVar:   Record<string, bigint>
	number:      Record<number, bigint>
	// only explicit integers
	integer:     Record<number, bigint>
	complex:     Record<number, bigint>
	string:      Record<string, bigint>
	logical:     Record<typeof RTrue | typeof RFalse, bigint>,
	call:        Record<string, bigint>,
	unnamedCall: bigint,
	// binop includes all assignments!
	binOp:       Record<string, bigint>,
	unaryOp:     Record<string, bigint>,
	// unknown content, records lexeme (can include break etc. for bodies)
	other:       Record<string, bigint>
}

export function emptyCommonSyntaxTypeCounts(): CommonSyntaxTypeCounts {
	return {
		total:       0n,
		singleVar:   {},
		number:      {},
		integer:     {},
		complex:     {},
		string:      {},
		logical:     {} as Record<typeof RTrue | typeof RFalse, bigint>,
		call:        {},
		unnamedCall: 0n,
		binOp:       {},
		unaryOp:     {},
		other:       {}
	}
}


function incrementEntry<T extends string | number | symbol>(map: Record<T, bigint>, key: T): void {
	map[key] = ((map[key] as bigint | undefined) ?? 0n) + 1n
}

/**
 * Updates the given counts based on the type of the given node.
 */
export function updateCommonSyntaxTypeCounts(current: CommonSyntaxTypeCounts, node: RNodeWithParent): CommonSyntaxTypeCounts {
	current.total++

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
