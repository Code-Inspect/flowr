import { assertAst, withShell } from '../../../_helper/shell'
import { exprList, numVal } from '../../../_helper/ast-builder'
import { rangeFrom } from '../../../../../src/util/range'
import { EmptyArgument, RType } from '../../../../../src'
import { label } from '../../../_helper/label'

describe('Parse function calls', withShell(shell => {
	describe('functions without arguments', () => {
		assertAst(label('f()', ['call-normal', 'name-normal']),
			shell, 'f()', exprList({
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
		assertAst(label('f(1, 2)', ['name-normal', 'call-normal', 'unnamed-arguments', 'numbers']),
			shell, 'f(1, 2)', exprList({
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
		assertAst(label('f(1,)', ['name-normal', 'call-normal', 'unnamed-arguments', 'numbers', 'empty-arguments']),
			shell, 'f(1,)', exprList({
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
					}, EmptyArgument],
			})
		)
	})
	describe('functions with named arguments', () => {
		assertAst(label('f(1, x=2, 4, y=3)', ['name-normal', 'call-normal', 'unnamed-arguments', 'named-arguments', 'numbers']),
			shell, 'f(1, x=2, 4, y=3)', exprList({
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
		assertAst(label('string arguments', ['name-normal', 'call-normal', 'string-arguments', 'strings']),
			shell,'f("a"=3,\'x\'=2)',
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
			}))
	})
	describe('directly called functions', () => {
		assertAst(label('Directly call with 2', ['call-anonymous', 'formals-named', 'numbers', 'name-normal', 'normal-definition', 'grouping']),
			shell, '(function(x) { x })(2)', exprList({
				type:           RType.FunctionCall,
				flavor:         'unnamed',
				location:       rangeFrom(1, 1, 1, 19),
				lexeme:         '(function(x) { x })',
				info:           {},
				calledFunction: {
					type:     RType.ExpressionList,
					location: undefined,
					lexeme:   undefined,
					info:     {},
					grouping: [{
						type:      RType.Symbol,
						location:  rangeFrom(1, 1, 1, 1),
						lexeme:    '(',
						content:   '(',
						info:      {},
						namespace: undefined
					}, {
						type:      RType.Symbol,
						location:  rangeFrom(1, 19, 1, 19),
						lexeme:    ')',
						content:   ')',
						info:      {},
						namespace: undefined
					}],
					children: [{
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
						body: {
							type:     RType.ExpressionList,
							location: undefined,
							lexeme:   undefined,
							info:     {},
							grouping: [{
								type:      RType.Symbol,
								location:  rangeFrom(1, 14, 1, 14),
								lexeme:    '{',
								content:   '{',
								info:      {},
								namespace: undefined
							}, {
								type:      RType.Symbol,
								location:  rangeFrom(1, 18, 1, 18),
								lexeme:    '}',
								content:   '}',
								info:      {},
								namespace: undefined
							}],
							children: [{
								type:      RType.Symbol,
								location:  rangeFrom(1, 16, 1, 16),
								lexeme:    'x',
								content:   'x',
								namespace: undefined,
								info:      {}
							}]
						},
						info: {}
					}]
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
		assertAst(label('Double call with only the second one being direct', ['call-anonymous', 'numbers', 'name-normal', 'normal-definition']),
			shell, 'a(1)(2)', exprList({
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
		assertAst(label('x::f()', ['name-normal', 'call-normal', 'accessing-exported-names']),
			shell, 'x::f()',
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
		assertAst(label("'f'()", ['name-quoted', 'call-normal']),
			shell, "'f'()",
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
	describe('Next and break as functions', () => {
		assertAst(label('next()', ['name-normal', 'call-normal', 'next']),
			shell, 'next()', exprList({
				type:     RType.Next,
				location: rangeFrom(1, 1, 1, 4),
				lexeme:   'next',
				info:     {}
			})
		)
	})
	assertAst(label('break()', ['name-normal', 'call-normal', 'break']),
		shell, 'break()', exprList({
			type:     RType.Break,
			location: rangeFrom(1, 1, 1, 5),
			lexeme:   'break',
			info:     {}

		})
	)
})
)
