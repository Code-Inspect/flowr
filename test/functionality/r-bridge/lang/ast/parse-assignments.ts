import { assertAst, withShell } from '../../../_helper/shell'
import { exprList, numVal } from '../../../_helper/ast-builder'
import { rangeFrom } from '../../../../../src/util/range'
import { OperatorDatabase, RType } from '../../../../../src'
import { label } from '../../../_helper/label'
import { AssignmentOperators } from '../../../_helper/provider'

describe('Parse simple assignments',
	withShell(shell => {
		describe('Constant Assignments', () => {
			for(const op of AssignmentOperators) {
				const opOffset = op.length - 1
				const data = OperatorDatabase[op]
				assertAst(label(`x ${op} 5`, ['binary-operator', 'infix-calls', 'function-calls', ...data.capabilities]),
					shell, `x ${op} 5`,exprList({
						type:     RType.BinaryOp,
						location: rangeFrom(1, 3, 1, 3 + opOffset),
						lexeme:   op,
						operator: op,
						info:     {},
						lhs:      {
							type:      RType.Symbol,
							location:  rangeFrom(1, 1, 1, 1),
							namespace: undefined,
							lexeme:    'x',
							content:   'x',
							info:      {}
						},
						rhs: {
							type:     RType.Number,
							location: rangeFrom(1, 5 + opOffset, 1, 5 + opOffset),
							lexeme:   '5',
							content:  numVal(5),
							info:     {}
						},
					})
				)
			}
		})

		// allow assignments to strings and function calls
		describe('Assignments to strings', () => {
			assertAst(label('Assign to Given String', ['binary-operator', 'infix-calls', 'function-calls', 'local-left-assignment', 'name-quoted', 'numbers']),
				shell, '\'a\' <- 5', exprList({
					type:     RType.BinaryOp,
					location: rangeFrom(1, 5, 1, 6),
					lexeme:   '<-',
					operator: '<-',
					info:     {},
					lhs:      {
						type:      RType.String,
						location:  rangeFrom(1, 1, 1, 3),
						namespace: undefined,
						lexeme:    "'a'",
						content:   {
							quotes: "'",
							str:    'a'
						},
						info: {}
					},
					rhs: {
						type:     RType.Number,
						location: rangeFrom(1, 8, 1, 8),
						lexeme:   '5',
						content:  numVal(5),
						info:     {}
					},
				})
			)
		})

		describe('Assignment with an expression list', () => {
			assertAst(label('x <- { 2 * 3 }', ['binary-operator', 'infix-calls', 'function-calls', 'local-left-assignment', 'name-normal', 'numbers', 'grouping']),
				shell, 'x <- { 2 * 3 }', exprList({
					type:     RType.BinaryOp,
					location: rangeFrom(1, 3, 1, 4),
					lexeme:   '<-',
					operator: '<-',
					info:     {},
					lhs:      {
						type:      RType.Symbol,
						location:  rangeFrom(1, 1, 1, 1),
						namespace: undefined,
						lexeme:    'x',
						content:   'x',
						info:      {}
					},
					rhs: {
						type:     RType.ExpressionList,
						lexeme:   undefined,
						location: undefined,
						info:     {},
						grouping: [{
							type:      RType.Symbol,
							lexeme:    '{',
							content:   '{',
							info:      {},
							namespace: undefined,
							location:  rangeFrom(1, 6, 1, 6)
						}, {
							type:      RType.Symbol,
							lexeme:    '}',
							content:   '}',
							info:      {},
							namespace: undefined,
							location:  rangeFrom(1, 14, 1, 14)
						}],
						children: [{
							type:     RType.BinaryOp,
							location: rangeFrom(1, 10, 1, 10),
							lexeme:   '*',
							operator: '*',
							info:     {},
							lhs:      {
								type:     RType.Number,
								location: rangeFrom(1, 8, 1, 8),
								lexeme:   '2',
								content:  numVal(2),
								info:     {}
							},
							rhs: {
								type:     RType.Number,
								location: rangeFrom(1, 12, 1, 12),
								lexeme:   '3',
								content:  numVal(3),
								info:     {}
							}
						}]
					},
				}), {
					ignoreAdditionalTokens: true
				}
			)
		})
	})
)
