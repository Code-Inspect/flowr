import { assertAst, withShell } from '../../../_helper/shell'
import { exprList } from '../../../_helper/ast-builder'
import { rangeFrom } from '../../../../../src/util/range'
import { RType } from '../../../../../src/r-bridge'
import { MIN_VERSION_PIPE } from '../../../../../src/r-bridge/lang-4.x/ast/model/versions'

describe('Parse Pipes', withShell(shell => {
	assertAst(
		'x |> f()',
		shell,
		'x |> f()',
		exprList({
			type:     RType.Pipe,
			location: rangeFrom(1, 3, 1, 4),
			lexeme:   '|>',
			info:     {},
			lhs:      {
				type:     RType.Argument,
				name:     undefined,
				location: rangeFrom(1, 1, 1, 1),
				lexeme:   'x',
				info:     {},
				value:    {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					lexeme:    'x',
					content:   'x',
					namespace: undefined,
					info:      {}
				}
			},
			rhs: {
				type:         RType.FunctionCall,
				flavor:       'named',
				location:     rangeFrom(1, 6, 1, 6),
				lexeme:       'f',
				info:         {},
				arguments:    [],
				functionName: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 6, 1, 6),
					lexeme:    'f',
					content:   'f',
					namespace: undefined,
					info:      {},
				}
			}
		}),
		{ minRVersion: MIN_VERSION_PIPE }
	)
	assertAst(
		'x |> f() |> g()',
		shell,
		'x |> f() |> g()',
		exprList({
			type:     RType.Pipe,
			location: rangeFrom(1, 10, 1, 11),
			lexeme:   '|>',
			info:     {},
			lhs:      {
				type:     RType.Argument,
				location: rangeFrom(1, 3, 1, 4),
				lexeme:   '|>',
				name:     undefined,
				info:     {},
				value:    {
					type:     RType.Pipe,
					location: rangeFrom(1, 3, 1, 4),
					lexeme:   '|>',
					info:     {},
					lhs:      {
						type:     RType.Argument,
						location: rangeFrom(1, 1, 1, 1),
						lexeme:   'x',
						name:     undefined,
						value:    {
							type:      RType.Symbol,
							location:  rangeFrom(1, 1, 1, 1),
							lexeme:    'x',
							content:   'x',
							namespace: undefined,
							info:      {},
						},
						info: {},
					},
					rhs: {
						type:         RType.FunctionCall,
						flavor:       'named',
						location:     rangeFrom(1, 6, 1, 6),
						lexeme:       'f',
						arguments:    [],
						functionName: {
							type:      RType.Symbol,
							location:  rangeFrom(1, 6, 1, 6),
							lexeme:    'f',
							content:   'f',
							namespace: undefined,
							info:      {},
						},
						info: {},
					}
				}
			},
			rhs: {
				type:         RType.FunctionCall,
				flavor:       'named',
				location:     rangeFrom(1, 13, 1, 13),
				lexeme:       'g',
				arguments:    [],
				info:         {},
				functionName: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 13, 1, 13),
					lexeme:    'g',
					content:   'g',
					namespace: undefined,
					info:      {}
				}
			}
		}),
		{ minRVersion: MIN_VERSION_PIPE }
	)
}))

