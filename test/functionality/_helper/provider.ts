// all examples are based on the R language def (Draft of 2023-03-15, 10.3.1)
import {
	type NamespaceIdentifier,
	RNa, RNull, type RNumberValue, type RStringValue,
	ArithmeticOperators,
	Assignments,
	ComparisonOperators,
	LogicalOperators,
	OperatorArity,
	OperatorDatabase, ModelFormulaOperators
} from '../../../src/r-bridge'

// maps a string to the expected R number parse value
export const RNumberPool: { val: RNumberValue, str: string }[] = [
	// the default block
	{ str: '1', val: { num: 1, complexNumber: false, markedAsInt: false } },
	{ str: '10', val: { num: 10, complexNumber: false, markedAsInt: false } },
	{ str: '0.1', val: { num: 0.1, complexNumber: false, markedAsInt: false } },
	{ str: '0.2', val: { num: 0.2, complexNumber: false, markedAsInt: false } },
	{ str: '1e-7', val: { num: 1e-7, complexNumber: false, markedAsInt: false } },
	{ str: '1.2e7', val: { num: 1.2e7, complexNumber: false, markedAsInt: false } },
	{ str: '0xAF12', val: { num: 0xAF12, complexNumber: false, markedAsInt: false } },
	// The special block
	{ str: 'Inf', val: { num: Infinity, complexNumber: false, markedAsInt: false } },
	{ str: 'NaN', val: { num: NaN, complexNumber: false, markedAsInt: false } },
	// floating hex notation
	{ str: '0x0p0', val: { num: 0, complexNumber: false, markedAsInt: false } },
	{ str: '0x1.1p1', val: { num: (1 + 1 / 16) * (2 ** 1), complexNumber: false, markedAsInt: false } },
	{ str: '0x1.1P1', val: { num: (1 + 1 / 16) * (2 ** 1), complexNumber: false, markedAsInt: false } },
	{ str: '0xAF.FEp42', val: { num: (10 * 16 + 15 + 15 / 16 + 14 / (16 ** 2)) * (2 ** 42), complexNumber: false, markedAsInt: false } },
	{ str: '0x.1p42', val: { num: (1 / 16) * (2 ** 42), complexNumber: false, markedAsInt: false } },
	{ str: '0x.p10', val: { num: 0, complexNumber: false, markedAsInt: false } },
	{ str: '0x.1p-5', val: { num: (1 / 16) * (2 ** -5), complexNumber: false, markedAsInt: false } },
	{ str: '0x.p-5', val: { num: 0, complexNumber: false, markedAsInt: false } },
	// the explicit integer block
	{ str: '1L', val: { num: 1, complexNumber: false, markedAsInt: true } },
	// { str: '0x10L', val: { num: 16, complexNumber: false, markedAsInt: true } },
	{ str: '1000000L', val: { num: 1000000, complexNumber: false, markedAsInt: true } },
	{ str: '1e6L', val: { num: 1000000, complexNumber: false, markedAsInt: true } },
	{ str: '1.L', val: { num: 1, complexNumber: false, markedAsInt: true } },
	{ str: '1.1L', val: { num: 1.1, complexNumber: false, markedAsInt: true } },
	{ str: '1e-3L', val: { num: 0.001, complexNumber: false, markedAsInt: true } },
	// the imaginary block
	{ str: '2i', val: { num: 2, complexNumber: true, markedAsInt: false } },
	{ str: '4.1i', val: { num: 4.1, complexNumber: true, markedAsInt: false } },
	{ str: '1e-2i', val: { num: 0.01, complexNumber: true, markedAsInt: false } }
]

export const RStringPool: { val: RStringValue, str: string }[] = [
	// the default block
	{ str: '""', val: { str: '', quotes: '"' } },
	{ str: "''", val: { str: '', quotes: "'" } },
	{ str: '"a"', val: { str: 'a', quotes: '"' } },
	{ str: "'a'", val: { str: 'a', quotes: "'" } },
	{ str: "'Hi'", val: { str: 'Hi', quotes: "'" } },
	// the quotes block
	{ str: '"\'"', val: { str: "'", quotes: '"' } },
	{ str: '\'"\'', val: { str: '"', quotes: "'" } },
	{ str: '\'a"b\'', val: { str: 'a"b', quotes: "'" } },
	// the escaped quotes block
	{ str: '"a\\"b"', val: { str: 'a\\"b', quotes: '"' } },
	{ str: '\'a\\\'b\'', val: { str: "a\\'b", quotes: "'" } },
	// keep non-lifted escapes
	{ str: '\'a\\"b\'', val: { str: 'a\\"b', quotes: "'" } },
	{ str: "\"a\\'b\"", val: { str: 'a\\\'b', quotes: '"' } },
	// embedded comments block
	{ str: '"a#b"', val: { str: 'a#b', quotes: '"' } },
	{ str: '"a # comment"', val: { str: 'a # comment', quotes: '"' } },
	// raw strings
	{ str: 'r"()"', val: { str: '()', quotes: '"', flag: 'raw' } },
	{ str: 'R"()"', val: { str: '()', quotes: '"', flag: 'raw' } },
	{ str: 'r\'()\'', val: { str: '()', quotes: '\'', flag: 'raw' } },
	{ str: 'r"(xx)"', val: { str: '(xx)', quotes: '"', flag: 'raw' } },
	{ str: 'r"[xx]"', val: { str: '[xx]', quotes: '"', flag: 'raw' } },
	{ str: 'r"{xx}"', val: { str: '{xx}', quotes: '"', flag: 'raw' } },
	{ str: 'r"--(xx)--"', val: { str: '--(xx)--', quotes: '"', flag: 'raw' } },
	// the advanced escape blocks
	{ str: '"\\n"', val: { str: '\\n', quotes: '"' } }, // newline
	{ str: '"\\r"', val: { str: '\\r', quotes: '"' } }, // carriage return
	{ str: '"\\t"', val: { str: '\\t', quotes: '"' } }, // horizontal tab
	{ str: '"\\b"', val: { str: '\\b', quotes: '"' } }, // backspace
	{ str: '"\\a"', val: { str: '\\a', quotes: '"' } }, // bell (\u0007)
	{ str: '"\\f"', val: { str: '\\f', quotes: '"' } }, // form feed
	{ str: '"\\v"', val: { str: '\\v', quotes: '"' } }, // vertical tab
	{ str: '"\\\\"', val: { str: '\\\\', quotes: '"' } }, // backslash
	{ str: '"\\123"', val: { str: '\\123', quotes: '"' } }, // octal (\x53)
	{ str: '"\\xAA"', val: { str: '\\xAA', quotes: '"' } }, // hex
	{ str: '"\\uAFFE"', val: { str: '\\uAFFE', quotes: '"' } }, // unicode 1
	{ str: '"\\u{AFFE}"', val: { str: '\\u{AFFE}', quotes: '"' } }, // unicode 2
	{ str: '"\\U10AFFE"', val: { str: '\\U10AFFE', quotes: '"' } }, // unicode 3
	{ str: '"\\U{10AFFE}"', val: { str: '\\U{10AFFE}', quotes: '"' } } // unicode 4
]

export const RSymbolPool: { val: string, str: string, namespace: NamespaceIdentifier | undefined, symbolStart: number }[] = [
	{ str: 'NA', val: RNa, namespace: undefined, symbolStart: 1 },
	{ str: 'NULL', val: RNull, namespace: undefined, symbolStart: 1 },
	{ str: 'x', val: 'x', namespace: undefined, symbolStart: 1 },
	{ str: 'x.y', val: 'x.y', namespace: undefined, symbolStart: 1 },
	{ str: 'x::y', val: 'y', namespace: 'x', symbolStart: 4 },
	// ::: for non-exported?
	{ str: 'x:::y', val: 'y', namespace: 'x', symbolStart: 5 }
]

const canBeABinaryOp = (op: string): boolean => {
	const arity = OperatorDatabase[op].arity
	return arity === OperatorArity.Binary || arity === OperatorArity.Both
}

const canBeAUnaryOp = (op: string): boolean => {
	const arity = OperatorDatabase[op].arity
	return arity === OperatorArity.Unary || arity === OperatorArity.Both
}


export const RArithmeticBinaryOpPool: { flavor: 'arithmetic', str: string }[] =
    ArithmeticOperators.filter(canBeABinaryOp).map(op => ({ str: op, flavor: 'arithmetic' }))

export const RLogicalBinaryOpPool: { flavor: 'logical', str: string }[] =
      LogicalOperators.filter(canBeABinaryOp).map(op => ({ str: op, flavor: 'logical' }))

export const RComparisonBinaryOpPool: { flavor: 'comparison', str: string }[] =
    ComparisonOperators.filter(canBeABinaryOp).map(op => ({ str: op, flavor: 'comparison' }))

export const RModelFormulaBinaryOpPool: { flavor: 'model formula', str: string }[] =
  ModelFormulaOperators.filter(canBeABinaryOp).map(op => ({ str: op, flavor: 'model formula' }))

export const RAssignmentOpPool: { flavor: 'assignment', str: string }[] =
    Assignments.filter(canBeABinaryOp).map(op => ({ str: op, flavor: 'assignment' }))

export const RNonAssignmentBinaryOpPool: { label: 'arithmetic' | 'logical' | 'comparison' | 'model formula', pool: typeof RArithmeticBinaryOpPool | typeof RLogicalBinaryOpPool | typeof RComparisonBinaryOpPool | typeof RModelFormulaBinaryOpPool }[] =
	[
		{ label: 'arithmetic', pool: RArithmeticBinaryOpPool },
		{ label: 'logical',    pool: RLogicalBinaryOpPool },
		{ label: 'comparison', pool: RComparisonBinaryOpPool },
		{ label: 'model formula', pool: RModelFormulaBinaryOpPool }
	]

export const RArithmeticUnaryOpPool: { flavor: 'arithmetic', str: string }[] =
  ArithmeticOperators.filter(canBeAUnaryOp).map(op => ({ str: op, flavor: 'arithmetic' }))

export const RLogicalUnaryOpPool: { flavor: 'logical', str: string }[] =
  LogicalOperators.filter(canBeAUnaryOp).map(op => ({ str: op, flavor: 'logical' }))

export const RModelFormulaUnaryOpPool: { flavor: 'model formula', str: string }[] =
  ModelFormulaOperators.filter(canBeAUnaryOp).map(op => ({ str: op, flavor: 'model formula' }))

export const RUnaryOpPool: { label: 'arithmetic' | 'logical' | 'model formula', pool: typeof RArithmeticUnaryOpPool | typeof RLogicalUnaryOpPool | typeof RModelFormulaUnaryOpPool }[] = [
	{ label: 'arithmetic',    pool: RArithmeticUnaryOpPool   },
	{ label: 'logical',       pool: RLogicalUnaryOpPool      },
	{ label: 'model formula', pool: RModelFormulaUnaryOpPool }
]
