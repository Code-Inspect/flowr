import { exprList, numVal } from '../../../_helper/ast-builder'
import { assertAst, withShell } from '../../../_helper/shell'
import { rangeFrom } from '../../../../../src/util/range'
import { label } from '../../../_helper/label'
import { OperatorDatabase } from '../../../../../src/r-bridge/lang-4.x/ast/model/operators'
import { RType } from '../../../../../src/r-bridge/lang-4.x/ast/model/type'

describe('Parse Larger Snippets', withShell((shell) => {
	describe('if-then, assignments, symbols, and comparisons', () => {
		assertAst(label('Manual Max Function', [
			'name-normal', ...OperatorDatabase['<-'].capabilities, ...OperatorDatabase['='].capabilities, ...OperatorDatabase['->'].capabilities, ...OperatorDatabase['<<-'].capabilities, ...OperatorDatabase['->>'].capabilities, 'numbers', 'if', ...OperatorDatabase['>'].capabilities, 'grouping', 'newlines'
		]), shell,
		`
a <- 3
b = 4
if (a >b) {
  max <<- a
  i ->2
} else {
  b ->> max
}
max
    `, exprList(
			{
				type:     RType.BinaryOp,
				lexeme:   '<-',
				operator: '<-',
				location: rangeFrom(2, 3, 2, 4),
				info:     {},
				lhs:      {
					type:      RType.Symbol,
					lexeme:    'a',
					namespace: undefined,
					content:   'a',
					location:  rangeFrom(2, 1, 2, 1),
					info:      {}
				},
				rhs: {
					type:     RType.Number,
					lexeme:   '3',
					content:  numVal(3),
					location: rangeFrom(2, 6, 2, 6),
					info:     {}
				},
			},
			{
				type:     RType.BinaryOp,
				lexeme:   '=',
				operator: '=',
				location: rangeFrom(3, 3, 3, 3),
				info:     {},
				lhs:      {
					type:      RType.Symbol,
					lexeme:    'b',
					namespace: undefined,
					content:   'b',
					location:  rangeFrom(3, 1, 3, 1),
					info:      {}
				},
				rhs: {
					type:     RType.Number,
					lexeme:   '4',
					content:  numVal(4),
					location: rangeFrom(3, 5, 3, 5),
					info:     {}
				},
			},
			{
				type:      RType.IfThenElse,
				lexeme:    'if',
				location:  rangeFrom(4, 1, 4, 2),
				info:      {},
				condition: {
					type:     RType.BinaryOp,
					lexeme:   '>',
					operator: '>',
					location: rangeFrom(4, 7, 4, 7),
					info:     {},
					lhs:      {
						type:      RType.Symbol,
						lexeme:    'a',
						namespace: undefined,
						content:   'a',
						location:  rangeFrom(4, 5, 4, 5),
						info:      {}
					},
					rhs: {
						type:      RType.Symbol,
						lexeme:    'b',
						namespace: undefined,
						content:   'b',
						location:  rangeFrom(4, 8, 4, 8),
						info:      {}
					},
				},
				then: {
					type:     RType.ExpressionList,
					grouping: [{
						type:      RType.Symbol,
						lexeme:    '{',
						location:  rangeFrom(4, 11, 4, 11),
						content:   '{',
						info:      {},
						namespace: undefined
					}, {
						type:      RType.Symbol,
						lexeme:    '}',
						location:  rangeFrom(7, 1, 7, 1),
						content:   '}',
						info:      {},
						namespace: undefined
					}],
					lexeme:   undefined,
					location: undefined,
					info:     {},
					children: [
						{
							type:     RType.BinaryOp,
							lexeme:   '<<-',
							operator: '<<-',
							location: rangeFrom(5, 7, 5, 9),
							info:     {},
							lhs:      {
								type:      RType.Symbol,
								lexeme:    'max',
								namespace: undefined,
								content:   'max',
								location:  rangeFrom(5, 3, 5, 5),
								info:      {}
							},
							rhs: {
								type:      RType.Symbol,
								lexeme:    'a',
								namespace: undefined,
								content:   'a',
								location:  rangeFrom(5, 11, 5, 11),
								info:      {}
							},
						},
						{
							type:     RType.BinaryOp,
							lexeme:   '->',
							operator: '->',
							location: rangeFrom(6, 5, 6, 6),
							info:     {},
							lhs:      {
								type:      RType.Symbol,
								lexeme:    'i',
								namespace: undefined,
								content:   'i',
								location:  rangeFrom(6, 3, 6, 3),
								info:      {}
							},
							rhs: {
								type:     RType.Number,
								lexeme:   '2',
								content:  numVal(2),
								location: rangeFrom(6, 7, 6, 7),
								info:     {}
							},
						},
					],
				},
				otherwise: {
					type:     RType.ExpressionList,
					location: undefined,
					lexeme:   undefined,
					info:     {},
					grouping: [{
						type:      RType.Symbol,
						lexeme:    '{',
						location:  rangeFrom(7, 8, 7, 8),
						content:   '{',
						info:      {},
						namespace: undefined
					}, {
						type:      RType.Symbol,
						lexeme:    '}',
						location:  rangeFrom(9, 1, 9, 1),
						content:   '}',
						info:      {},
						namespace: undefined
					}],
					children: [{
						type:     RType.BinaryOp,
						lexeme:   '->>',
						operator: '->>',
						location: rangeFrom(8, 5, 8, 7),
						info:     {},
						lhs:      {
							type:      RType.Symbol,
							lexeme:    'b',
							namespace: undefined,
							content:   'b',
							location:  rangeFrom(8, 3, 8, 3),
							info:      {}
						},
						rhs: {
							type:      RType.Symbol,
							lexeme:    'max',
							namespace: undefined,
							content:   'max',
							location:  rangeFrom(8, 9, 8, 11),
							info:      {}
						},
					}]
				},
			},
			{
				type:      RType.Symbol,
				lexeme:    'max',
				content:   'max',
				namespace: undefined,
				location:  rangeFrom(10, 1, 10, 3),
				info:      {}
			}
		), {
			ignoreAdditionalTokens: true
		}
		)
	})
})
)
