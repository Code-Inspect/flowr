import { assertAst, withShell } from '../../../_helper/shell'
import { exprList, numVal } from '../../../_helper/ast-builder'
import { rangeFrom } from '../../../../../src/util/range'
import { RType } from '../../../../../src'
import { label } from '../../../_helper/label'

describe('Parse expression lists', withShell(shell => {
	describe('Expression lists with newlines and braces', () => {
		// this is already covered by other tests, yet it is good to state it here explicitly (expr list is the default top-level token for R)
		assertAst(label('single element', ['numbers']),
			shell, '42', exprList({
				type:     RType.Number,
				location: rangeFrom(1, 1, 1, 2),
				lexeme:   '42',
				content:  numVal(42),
				info:     {}
			})

		)
		// the r standard does not seem to allow '\r\n' or '\n\r'
		assertAst(label('two lines', ['name-normal', 'numbers', 'newlines']),
			shell, '42\na',
			exprList(
				{
					type:     RType.Number,
					location: rangeFrom(1, 1, 1, 2),
					lexeme:   '42',
					content:  numVal(42),
					info:     {}
				},
				{
					type:      RType.Symbol,
					location:  rangeFrom(2, 1, 2, 1),
					namespace: undefined,
					lexeme:    'a',
					content:   'a',
					info:      {}
				}
			)
		)

		assertAst(label('three lines', ['name-normal', 'numbers', 'newlines']),
			shell, 'a\nb\nc',
			exprList(
				{
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					lexeme:    'a',
					content:   'a',
					namespace: undefined,
					info:      {}
				},
				{
					type:      RType.Symbol,
					location:  rangeFrom(2, 1, 2, 1),
					namespace: undefined,
					lexeme:    'b',
					content:   'b',
					info:      {}
				},
				{
					type:      RType.Symbol,
					location:  rangeFrom(3, 1, 3, 1),
					lexeme:    'c',
					content:   'c',
					namespace: undefined,
					info:      {}
				},
			)
		)

		assertAst(label('many lines', ['name-normal', 'numbers', 'newlines']),
			shell, 'a\nb\nc\nd\nn2\nz\n',
			exprList(
				{
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					namespace: undefined,
					lexeme:    'a',
					content:   'a',
					info:      {}
				},
				{
					type:      RType.Symbol,
					location:  rangeFrom(2, 1, 2, 1),
					namespace: undefined,
					lexeme:    'b',
					content:   'b',
					info:      {}
				},
				{
					type:      RType.Symbol,
					location:  rangeFrom(3, 1, 3, 1),
					namespace: undefined,
					lexeme:    'c',
					content:   'c',
					info:      {}
				},
				{
					type:      RType.Symbol,
					location:  rangeFrom(4, 1, 4, 1),
					namespace: undefined,
					lexeme:    'd',
					content:   'd',
					info:      {}
				},
				{
					type:      RType.Symbol,
					location:  rangeFrom(5, 1, 5, 2),
					namespace: undefined,
					lexeme:    'n2',
					content:   'n2',
					info:      {}
				},
				{
					type:      RType.Symbol,
					location:  rangeFrom(6, 1, 6, 1),
					namespace: undefined,
					lexeme:    'z',
					content:   'z',
					info:      {}
				}
			)
		)

		assertAst(label('Two Lines With Braces', ['name-normal', 'numbers', 'grouping', 'newlines']),
			shell, '{ 42\na }', exprList({
				type:     RType.ExpressionList,
				location: undefined,
				grouping: [
					{
						type:      RType.Symbol,
						location:  rangeFrom(1, 1, 1, 1),
						lexeme:    '{',
						content:   '{',
						info:      {},
						namespace: undefined
					},
					{
						type:      RType.Symbol,
						location:  rangeFrom(2, 3, 2, 3),
						lexeme:    '}',
						content:   '}',
						info:      {},
						namespace: undefined
					}
				],
				lexeme:   undefined,
				info:     { },
				children: [
					{
						type:     RType.Number,
						location: rangeFrom(1, 3, 1, 4),
						lexeme:   '42',
						content:  numVal(42),
						info:     {}
					},
					{
						type:      RType.Symbol,
						location:  rangeFrom(2, 1, 2, 1),
						namespace: undefined,
						lexeme:    'a',
						content:   'a',
						info:      {}
					},
				],
			})
		)

		// { 42\na }{ x } seems to be illegal for R...
		assertAst(label('Multiple Braces', ['name-normal', 'numbers', 'grouping', 'newlines']),
			shell, '{ 42\na }\n{ x }', exprList(
				{
					type:     RType.ExpressionList,
					location: undefined,
					grouping: [
						{
							type:      RType.Symbol,
							location:  rangeFrom(1, 1, 1, 1),
							lexeme:    '{',
							content:   '{',
							info:      {},
							namespace: undefined
						},
						{
							type:      RType.Symbol,
							location:  rangeFrom(2, 3, 2, 3),
							lexeme:    '}',
							content:   '}',
							info:      {},
							namespace: undefined
						}
					],
					lexeme:   undefined,
					info:     { },
					children: [
						{
							type:     RType.Number,
							location: rangeFrom(1, 3, 1, 4),
							lexeme:   '42',
							content:  numVal(42),
							info:     {}
						},
						{
							type:      RType.Symbol,
							location:  rangeFrom(2, 1, 2, 1),
							namespace: undefined,
							lexeme:    'a',
							content:   'a',
							info:      {}
						},
					],
				},
				{
					type:     RType.ExpressionList,
					location: undefined,
					info:     {},
					lexeme:   undefined,
					grouping: [
						{
							type:      RType.Symbol,
							location:  rangeFrom(3, 1, 3, 1),
							lexeme:    '{',
							content:   '{',
							info:      {},
							namespace: undefined
						},
						{
							type:      RType.Symbol,
							location:  rangeFrom(3, 5, 3, 5),
							lexeme:    '}',
							content:   '}',
							info:      {},
							namespace: undefined
						}],
					children: [{
						type:      RType.Symbol,
						location:  rangeFrom(3, 3, 3, 3),
						namespace: undefined,
						lexeme:    'x',
						content:   'x',
						info:      {}
					}]
				}
			)
		)
	})

	describe('Expression lists with semicolons', () => {
		assertAst(label('Two Elements in Same Line', ['numbers', 'name-normal', 'semicolons']),
			shell, '42;a',
			{
				type:     RType.ExpressionList,
				lexeme:   undefined,
				grouping: undefined,
				info:     { },
				children: [
					{
						type:     RType.Number,
						location: rangeFrom(1, 1, 1, 2),
						lexeme:   '42',
						content:  numVal(42),
						info:     {}
					},
					{
						type:      RType.Symbol,
						location:  rangeFrom(1, 4, 1, 4),
						namespace: undefined,
						lexeme:    'a',
						content:   'a',
						info:      {}
					}
				]
			}
		)

		assertAst(label('Empty split with semicolon', ['numbers', 'semicolons', 'grouping']),
			shell, '{ 3; }', exprList({
				type:     RType.ExpressionList,
				lexeme:   undefined,
				info:     {},
				location: undefined,
				grouping: [
					{
						type:      RType.Symbol,
						location:  rangeFrom(1, 1, 1, 1),
						lexeme:    '{',
						content:   '{',
						info:      {},
						namespace: undefined
					},
					{
						type:      RType.Symbol,
						location:  rangeFrom(1, 6, 1, 6),
						lexeme:    '}',
						content:   '}',
						info:      {},
						namespace: undefined
					}
				],
				children: [{
					type:     RType.Number,
					location: rangeFrom(1, 3, 1, 3),
					lexeme:   '3',
					content:  numVal(3),
					info:     {}
				}]
			})
		)


		assertAst(label('Inconsistent split with semicolon', ['numbers', 'semicolons', 'newlines']),
			shell, '1\n2; 3\n4',
			{
				type:     RType.ExpressionList,
				lexeme:   undefined,
				grouping: undefined,
				info:     { },
				children: [
					{
						type:     RType.Number,
						location: rangeFrom(1, 1, 1, 1),
						lexeme:   '1',
						content:  numVal(1),
						info:     {}
					}, {
						type:     RType.Number,
						location: rangeFrom(2, 1, 2, 1),
						lexeme:   '2',
						content:  numVal(2),
						info:     {}
					}, {
						type:     RType.Number,
						location: rangeFrom(2, 4, 2, 4),
						lexeme:   '3',
						content:  numVal(3),
						info:     {}
					}, {
						type:     RType.Number,
						location: rangeFrom(3, 1, 3, 1),
						lexeme:   '4',
						content:  numVal(4),
						info:     {}
					}
				]
			}
		)
	})
})
)
