import { assertAst, withShell } from '../../../_helper/shell'
import { exprList } from '../../../_helper/ast-builder'
import { rangeFrom } from '../../../../../src/util/range'
import { RType } from '../../../../../src/r-bridge'

describe('Parse symbols', withShell(shell => {
	assertAst('Simple Symbol', shell, 'a', exprList({
		type:      RType.Symbol,
		location:  rangeFrom(1, 1, 1, 1),
		namespace: undefined,
		lexeme:    'a',
		content:   'a',
		info:      {}
	}))
	assertAst('With Namespace', shell, 'a::b', exprList({
		type:      RType.Symbol,
		location:  rangeFrom(1, 4, 1, 4),
		namespace: 'a',
		lexeme:    'b',
		content:   'b',
		info:      {}
	}))
	assertAst('With Quotes and Namespace', shell, 'a::"b"', exprList({
		type:      RType.Symbol,
		location:  rangeFrom(1, 4, 1, 6),
		namespace: 'a',
		lexeme:    '"b"',
		content:   '"b"',
		info:      {}
	}))
}))

