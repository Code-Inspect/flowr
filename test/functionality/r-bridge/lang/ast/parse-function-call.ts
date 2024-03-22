import { assertAst, withShell } from '../../../_helper/shell'
import { exprList, numVal } from '../../../_helper/ast-builder'
import { rangeFrom } from '../../../../../src/util/range'
import { RType } from '../../../../../src/r-bridge'
import { ensureExpressionList } from '../../../../../src/r-bridge/lang-4.x/ast/parser/main/internal'

describe('Parse function calls', withShell((shell) => {
	describe('functions without arguments', () => {
		assertAst(
			'f()',
			shell,
			'f()',
			exprList({
				type:         RType.FunctionCall,
				flavor:       'named',
				location:     rangeFrom(1, 1, 1, 1),
				lexeme:       'f',
				info:         {},
				functionName: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					lexeme:    'f',
					content:   'f',
					namespace: undefined,
					info:      {},
				},
				arguments: [],
			})
		)
	})
	describe('functions with arguments', () => {
		assertAst(
			'f(1, 2)',
			shell,
			'f(1, 2)',
			exprList({
				type:         RType.FunctionCall,
				flavor:       'named',
				location:     rangeFrom(1, 1, 1, 1),
				lexeme:       'f',
				info:         {},
				functionName: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					lexeme:    'f',
					content:   'f',
					namespace: undefined,
					info:      {}
				},
				arguments: [
					{
						type:     RType.Argument,
						location: rangeFrom(1, 3, 1, 3),
						name:     undefined,
						info:     {},
						lexeme:   '1',
						value:    {
							type:     RType.Number,
							location: rangeFrom(1, 3, 1, 3),
							lexeme:   '1',
							content:  numVal(1),
							info:     {}
						}
					}, {
						type:     RType.Argument,
						location: rangeFrom(1, 6, 1, 6),
						name:     undefined,
						lexeme:   '2',
						info:     {},
						value:    {
							type:     RType.Number,
							location: rangeFrom(1, 6, 1, 6),
							lexeme:   '2',
							content:  numVal(2),
							info:     {}
						}
					}
				],
			})
		)
	})
	describe('functions with named arguments', () => {
		assertAst(
			'f(1, x=2, 4, y=3)',
			shell,
			'f(1, x=2, 4, y=3)',
			exprList({
				type:         RType.FunctionCall,
				flavor:       'named',
				location:     rangeFrom(1, 1, 1, 1),
				lexeme:       'f',
				info:         {},
				functionName: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					lexeme:    'f',
					content:   'f',
					namespace: undefined,
					info:      {}
				},
				arguments: [
					{
						type:     RType.Argument,
						location: rangeFrom(1, 3, 1, 3),
						name:     undefined,
						info:     {},
						lexeme:   '1',
						value:    {
							type:     RType.Number,
							location: rangeFrom(1, 3, 1, 3),
							lexeme:   '1',
							content:  numVal(1),
							info:     {}
						}
					}, {
						type:     RType.Argument,
						location: rangeFrom(1, 6, 1, 6),
						name:     {
							type:      RType.Symbol,
							location:  rangeFrom(1, 6, 1, 6),
							lexeme:    'x',
							content:   'x',
							namespace: undefined,
							info:      {}
						},
						lexeme: 'x',
						info:   {},
						value:  {
							type:     RType.Number,
							location: rangeFrom(1, 8, 1, 8),
							lexeme:   '2',
							content:  numVal(2),
							info:     {}
						}
					}, {
						type:     RType.Argument,
						location: rangeFrom(1, 11, 1, 11),
						name:     undefined,
						info:     {},
						lexeme:   '4',
						value:    {
							type:     RType.Number,
							location: rangeFrom(1, 11, 1, 11),
							lexeme:   '4',
							content:  numVal(4),
							info:     {}
						}
					}, {
						type:     RType.Argument,
						location: rangeFrom(1, 14, 1, 14),
						name:     {
							type:      RType.Symbol,
							location:  rangeFrom(1, 14, 1, 14),
							lexeme:    'y',
							content:   'y',
							namespace: undefined,
							info:      {}
						},
						lexeme: 'y',
						info:   {},
						value:  {
							type:     RType.Number,
							location: rangeFrom(1, 16, 1, 16),
							lexeme:   '3',
							content:  numVal(3),
							info:     {}
						}
					}
				],
			})
		)
		const code = 'f("a"=3,\'x\'=2)'
		assertAst(
			`string arguments - ${code}`,
			shell,
			code,
			exprList({
				type:         RType.FunctionCall,
				flavor:       'named',
				location:     rangeFrom(1, 1, 1, 1),
				lexeme:       'f',
				info:         {},
				functionName: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					lexeme:    'f',
					content:   'f',
					namespace: undefined,
					info:      {}
				},
				arguments: [
					{
						type:     RType.Argument,
						location: rangeFrom(1, 3, 1, 5),
						name:     {
							type:      RType.Symbol,
							location:  rangeFrom(1, 3, 1, 5),
							lexeme:    '"a"',
							content:   'a',
							namespace: undefined,
							info:      {}
						},
						lexeme: '"a"',
						info:   {},
						value:  {
							type:     RType.Number,
							location: rangeFrom(1, 7, 1, 7),
							lexeme:   '3',
							content:  numVal(3),
							info:     {}
						}
					},
					{
						type:     RType.Argument,
						location: rangeFrom(1, 9, 1, 11),
						name:     {
							type:      RType.Symbol,
							location:  rangeFrom(1, 9, 1, 11),
							lexeme:    '\'x\'',
							content:   'x',
							namespace: undefined,
							info:      {}
						},
						lexeme: '\'x\'',
						info:   {},
						value:  {
							type:     RType.Number,
							location: rangeFrom(1, 13, 1, 13),
							lexeme:   '2',
							content:  numVal(2),
							info:     {}
						}
					}
				],
			})
		)
	})
	describe('directly called functions', () => {
		assertAst(
			'Directly call with 2',
			shell,
			'(function(x) { x })(2)',
			exprList({
				type:           RType.FunctionCall,
				flavor:         'unnamed',
				location:       rangeFrom(1, 1, 1, 19),
				lexeme:         '(function(x) { x })',
				info:           {},
				calledFunction: {
					type:       RType.FunctionDefinition,
					location:   rangeFrom(1, 2, 1, 9),
					lexeme:     'function',
					parameters: [{
						type:         RType.Parameter,
						location:     rangeFrom(1, 11, 1, 11),
						special:      false,
						lexeme:       'x',
						defaultValue: undefined,
						name:         {
							type:      RType.Symbol,
							location:  rangeFrom(1, 11, 1, 11),
							lexeme:    'x',
							content:   'x',
							namespace: undefined,
							info:      {}
						},
						info: {},
					}],
					body: ensureExpressionList({
						type:      RType.Symbol,
						location:  rangeFrom(1, 16, 1, 16),
						lexeme:    'x',
						content:   'x',
						namespace: undefined,
						info:      {}
					}),
					info: {}
				},
				arguments: [
					{
						type:     RType.Argument,
						location: rangeFrom(1, 21, 1, 21),
						name:     undefined,
						info:     {},
						lexeme:   '2',
						value:    {
							type:     RType.Number,
							location: rangeFrom(1, 21, 1, 21),
							lexeme:   '2',
							content:  numVal(2),
							info:     {}
						}
					}
				]
			}), {
				ignoreAdditionalTokens: true
			}
		)
		assertAst(
			'Double call with only the second one being direct',
			shell,
			'a(1)(2)',
			exprList({
				type:           RType.FunctionCall,
				flavor:         'unnamed',
				location:       rangeFrom(1, 1, 1, 4),
				lexeme:         'a(1)',
				info:           {},
				calledFunction: {
					type:         RType.FunctionCall,
					flavor:       'named',
					functionName: {
						type:      RType.Symbol,
						location:  rangeFrom(1, 1, 1, 1),
						lexeme:    'a',
						content:   'a',
						namespace: undefined,
						info:      {}
					},
					location:  rangeFrom(1, 1, 1, 1),
					lexeme:    'a',
					arguments: [{
						type:     RType.Argument,
						location: rangeFrom(1, 3, 1, 3),
						lexeme:   '1',
						name:     undefined,
						info:     {},
						value:    {
							type:     RType.Number,
							location: rangeFrom(1, 3, 1, 3),
							lexeme:   '1',
							content:  numVal(1),
							info:     {}
						}
					}],
					info: {}
				},
				arguments: [
					{
						type:     RType.Argument,
						location: rangeFrom(1, 6, 1, 6),
						name:     undefined,
						info:     {},
						lexeme:   '2',
						value:    {
							type:     RType.Number,
							location: rangeFrom(1, 6, 1, 6),
							lexeme:   '2',
							content:  numVal(2),
							info:     {}
						}
					}
				]
			})
		)
	})
	describe('functions with explicit namespacing', () => {
		assertAst(
			'x::f()',
			shell,
			'x::f()',
			exprList({
				type:         RType.FunctionCall,
				flavor:       'named',
				location:     rangeFrom(1, 1, 1, 4),
				lexeme:       'x::f',
				info:         {},
				functionName: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 4, 1, 4),
					lexeme:    'f',
					content:   'f',
					namespace: 'x',
					info:      {}
				},
				arguments: [],
			})
		)
	})
	describe('functions which are called as string', () => {
		assertAst(
			"'f'()",
			shell,
			"'f'()",
			exprList({
				type:         RType.FunctionCall,
				flavor:       'named',
				location:     rangeFrom(1, 1, 1, 3),
				lexeme:       "'f'",
				info:         {},
				functionName: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 3),
					lexeme:    "'f'",
					content:   'f',
					namespace: undefined,
					info:      {}
				},
				arguments: [],
			})
		)
	})
	describe('Reserved wrong functions', () => {
		assertAst(
			'next()',
			shell,
			'next()',
			exprList({
				type:     RType.Next,
				location: rangeFrom(1, 1, 1, 4),
				lexeme:   'next',
				info:     {}

			})
		)
		assertAst(
			'break()',
			shell,
			'break()',
			exprList({
				type:     RType.Break,
				location: rangeFrom(1, 1, 1, 5),
				lexeme:   'break',
				info:     {}

			})
		)
	})
})
)
