import { assertAst, withShell } from '../../../_helper/shell'
import { exprList, numVal } from '../../../_helper/ast-builder'
import { AssignmentOperators, BinaryOperatorPool, UnaryOperatorPool } from '../../../_helper/provider'
import { OperatorDatabase, type RShell, RType } from '../../../../../src'
import { rangeFrom } from '../../../../../src/util/range'
import { label } from '../../../_helper/label'
import { startAndEndsWith } from '../../../../../src/util/strings'

describe('Parse simple operations', withShell(shell => {
	describe('unary operations', () => {
		for(const op of UnaryOperatorPool) {
			const simpleInput = `${op}42`
			const opOffset = op.length - 1
			const opData = OperatorDatabase[op]
			assertAst(label(`${simpleInput}`, ['unary-operator', 'numbers', ...opData.capabilities]),
				shell, simpleInput, exprList({
					type:     RType.UnaryOp,
					operator: op,
					lexeme:   op,
					location: rangeFrom(1, 1, 1, 1 + opOffset),
					info:     {},
					operand:  {
						type:     RType.Number,
						location: rangeFrom(1, 2 + opOffset, 1, 3 + opOffset),
						lexeme:   '42',
						content:  numVal(42),
						info:     {}
					},
				})
			)
		}
	})
	describe('? question', () => {
		assertAst(label('? x', ['unary-operator', 'built-in-help', 'name-normal']),
			shell, '? x', exprList({
				type:     RType.UnaryOp,
				location: rangeFrom(1, 1, 1, 1),
				operator: '?',
				lexeme:   '?',
				info:     {},
				operand:  {
					type:      RType.Symbol,
					location:  rangeFrom(1, 3, 1, 3),
					lexeme:    'x',
					content:   'x',
					namespace: undefined,
					info:      {}
				}
			})
		)
	})

	describe('Binary Operations', () => {
		for(const op of [...BinaryOperatorPool].filter(op => !startAndEndsWith(op, '%'))) {
			describePrecedenceTestsForOp(op, shell)
		}

		describe('Intermixed with comments', () => {
			assertAst(label('1 + # comment\n2', ['binary-operator', 'infix-calls', 'function-calls', 'numbers', 'comments', 'newlines']),
				shell, '1 + # comment\n2', exprList({ // hoist children
					type:     RType.ExpressionList,
					location: rangeFrom(1, 1, 2, 1),
					grouping: undefined,
					info:     {},
					lexeme:   '1 + # comment\n2',
					children: [
						{
							type:     RType.Comment,
							content:  ' comment',
							lexeme:   '# comment',
							location: rangeFrom(1, 5, 1, 13),
							info:     {}
						},
						{
							type:     RType.BinaryOp,
							info:     {},
							lexeme:   '+',
							operator: '+',
							location: rangeFrom(1, 3, 1, 3),
							lhs:      {
								type:     RType.Number,
								content:  numVal(1),
								info:     {},
								lexeme:   '1',
								location: rangeFrom(1, 1, 1, 1)
							},
							rhs: {
								type:     RType.Number,
								content:  numVal(2),
								info:     {},
								lexeme:   '2',
								location: rangeFrom(2, 1, 2, 1)
							}
						}
					]
				}), {
					ignoreAdditionalTokens: false
				}
			)
		})
		describe('Using unknown special infix operator', () => {
			assertAst(label('1 %xx% 2', ['binary-operator', 'infix-calls', 'function-calls', 'numbers', 'special-operator']),
				shell, '1 %xx% 2', exprList({
					type:         RType.FunctionCall,
					flavor:       'named',
					infixSpecial: true,
					info:         {},
					lexeme:       '1 %xx% 2',
					functionName: {
						type:      RType.Symbol,
						lexeme:    '%xx%',
						content:   '%xx%',
						namespace: undefined,
						location:  rangeFrom(1, 3, 1, 6),
						info:      {}
					},
					location:  rangeFrom(1, 3, 1, 6),
					arguments: [
						{
							type:     RType.Argument,
							info:     {},
							lexeme:   '1',
							name:     undefined,
							location: rangeFrom(1, 1, 1, 1),
							value:    {
								type:     RType.Number,
								content:  numVal(1),
								info:     {},
								lexeme:   '1',
								location: rangeFrom(1, 1, 1, 1)
							}
						}, {
							type:     RType.Argument,
							info:     {},
							lexeme:   '2',
							name:     undefined,
							location: rangeFrom(1, 8, 1, 8),
							value:    {
								type:     RType.Number,
								content:  numVal(2),
								info:     {},
								lexeme:   '2',
								location: rangeFrom(1, 8, 1, 8)
							}
						}
					]
				})
			)
		})
	})
})
)

function describePrecedenceTestsForOp(op: string, shell: RShell): void {
	const comparisonPrecedenceOperators = new Set(['<', '<=', '>', '>=', '==', '!=', '', '=='])

	describe(`${op}`, () => {
		const simpleInput = `1 ${op} 1`
		const opOffset = op.length - 1
		const opData = OperatorDatabase[op]
		assertAst(label(simpleInput, ['binary-operator', 'infix-calls', 'function-calls', 'numbers', ...opData.capabilities]),
			shell, simpleInput, exprList({
				type:     RType.BinaryOp,
				operator: op,
				lexeme:   op,
				location: rangeFrom(1, 3, 1, 3 + opOffset),
				info:     {},
				lhs:      {
					type:     RType.Number,
					location: rangeFrom(1, 1, 1, 1),
					lexeme:   '1',
					content:  numVal(1),
					info:     {}
				},
				rhs: {
					type:     RType.Number,
					location: rangeFrom(1, 5 + opOffset, 1, 5 + opOffset),
					lexeme:   '1',
					content:  numVal(1),
					info:     {}
				}
			}
			))

		if(!comparisonPrecedenceOperators.has(op)) {
			let [offsetL, offsetC, offsetR] = [1, 2, 2]

			assertAst(label('Single Parenthesis', ['binary-operator', 'infix-calls', 'function-calls', 'numbers', 'grouping', ...opData.capabilities]),
				shell, `(1 ${op} 1) ${op} 42`, exprList({
					type:     RType.BinaryOp,
					operator: op,
					lexeme:   op,
					location: rangeFrom(1, 7 + opOffset + offsetC, 1, 7 + 2 * opOffset + offsetC),
					info:     {},
					lhs:      {
						type:     RType.ExpressionList,
						location: undefined,
						grouping: [{
							type:      RType.Symbol,
							location:  rangeFrom(1, 1, 1, 1),
							lexeme:    '(',
							content:   '(',
							info:      {},
							namespace: undefined
						}, {
							type:      RType.Symbol,
							location:  rangeFrom(1, 6 + opOffset + offsetL, 1, 6 + opOffset + offsetL),
							lexeme:    ')',
							content:   ')',
							info:      {},
							namespace: undefined
						}],
						lexeme:   undefined,
						info:     {},
						children: [{
							type:     RType.BinaryOp,
							operator: op,
							lexeme:   op,
							location: rangeFrom(1, 3 + offsetL, 1, 3 + opOffset + offsetL),
							info:     {},
							lhs:      {
								type:     RType.Number,
								location: rangeFrom(1, 1 + offsetL, 1, 1 + offsetL),
								lexeme:   '1',
								content:  numVal(1),
								info:     {}
							},
							rhs: {
								type:     RType.Number,
								location: rangeFrom(1, 5 + opOffset + offsetL, 1, 5 + opOffset + offsetL),
								lexeme:   '1',
								content:  numVal(1),
								info:     {}
							}
						}]
					},
					rhs: {
						type:     RType.Number,
						location: rangeFrom(1, 9 + 2 * opOffset + offsetR, 1, 10 + 2 * opOffset + offsetR),
						lexeme:   '42',
						content:  numVal(42),
						info:     {}
					}
				}), {
					ignoreAdditionalTokens: true
				});

			([offsetL, offsetC, offsetR] = [1, 2, 3])
			assertAst(label('Multiple Parenthesis', ['binary-operator', 'infix-calls', 'function-calls', 'numbers', 'grouping', ...opData.capabilities]),
				shell, `(1 ${op} 1) ${op} (42)`, exprList({
					type:     RType.BinaryOp,
					operator: op,
					lexeme:   op,
					location: rangeFrom(1, 7 + opOffset + offsetC, 1, 7 + 2 * opOffset + offsetC),
					info:     {},
					lhs:      {
						type:     RType.ExpressionList,
						location: undefined,
						grouping: [{
							type:      RType.Symbol,
							location:  rangeFrom(1, 1, 1, 1),
							lexeme:    '(',
							content:   '(',
							info:      {},
							namespace: undefined
						}, {
							type:      RType.Symbol,
							location:  rangeFrom(1, 6 + opOffset + offsetL, 1, 6 + opOffset + offsetL),
							lexeme:    ')',
							content:   ')',
							info:      {},
							namespace: undefined
						}],
						lexeme:   undefined,
						info:     {},
						children: [{
							type:     RType.BinaryOp,
							operator: op,
							lexeme:   op,
							location: rangeFrom(1, 3 + offsetL, 1, 3 + opOffset + offsetL),
							info:     {},
							lhs:      {
								type:     RType.Number,
								location: rangeFrom(1, 1 + offsetL, 1, 1 + offsetL),
								lexeme:   '1',
								content:  numVal(1),
								info:     {}
							},
							rhs: {
								type:     RType.Number,
								location: rangeFrom(1, 5 + opOffset + offsetL, 1, 5 + opOffset + offsetL),
								lexeme:   '1',
								content:  numVal(1),
								info:     {}
							}
						}]
					},
					rhs: {
						type:     RType.ExpressionList,
						location: undefined,
						grouping: [{
							type:      RType.Symbol,
							location:  rangeFrom(1, 8 + 2 * opOffset + offsetR, 1, 8 + 2 * opOffset + offsetR),
							lexeme:    '(',
							content:   '(',
							info:      {},
							namespace: undefined
						}, {
							type:      RType.Symbol,
							location:  rangeFrom(1, 11 + 2 * opOffset + offsetR, 1, 11 + 2 * opOffset + offsetR),
							lexeme:    ')',
							content:   ')',
							info:      {},
							namespace: undefined
						}],
						lexeme:   undefined,
						info:     {},
						children: [{
							type:     RType.Number,
							location: rangeFrom(1, 9 + 2 * opOffset + offsetR, 1, 10 + 2 * opOffset + offsetR),
							lexeme:   '42',
							content:  numVal(42),
							info:     {}
						}]
					}
				}), {
					ignoreAdditionalTokens: true
				})

			// exponentiation and assignments has a different behavior when nested without parenthesis
			if(op !== '^' && op !== '**' && !AssignmentOperators.includes(op)) {
				[offsetL, offsetC, offsetR] = [0, 0, 0]

				assertAst(label('No Parenthesis', ['binary-operator', 'infix-calls', 'function-calls', 'numbers', 'grouping', ...opData.capabilities]),
					shell, `1 ${op} 1 ${op} 42`, exprList({
						type:     RType.BinaryOp,
						operator: op,
						lexeme:   op,
						location: rangeFrom(1, 7 + opOffset + offsetC, 1, 7 + 2 * opOffset + offsetC),
						info:     {},
						lhs:      {
							type:     RType.BinaryOp,
							operator: op,
							lexeme:   op,
							location: rangeFrom(1, 3 + offsetL, 1, 3 + opOffset + offsetL),
							info:     {},
							lhs:      {
								type:     RType.Number,
								location: rangeFrom(1, 1 + offsetL, 1, 1 + offsetL),
								lexeme:   '1',
								content:  numVal(1),
								info:     {}
							},
							rhs: {
								type:     RType.Number,
								location: rangeFrom(1, 5 + opOffset + offsetL, 1, 5 + opOffset + offsetL),
								lexeme:   '1',
								content:  numVal(1),
								info:     {}
							}
						},
						rhs: {
							type:     RType.Number,
							location: rangeFrom(1, 9 + 2 * opOffset + offsetR, 1, 10 + 2 * opOffset + offsetR),
							lexeme:   '42',
							content:  numVal(42),
							info:     {}
						}
					}), {
						ignoreAdditionalTokens: true
					})
			}

			assertAst(label('Invert precedence', ['binary-operator', 'infix-calls', 'function-calls', 'numbers', 'grouping', ...opData.capabilities]),
				shell, `1 ${op} (1 ${op} 42)`, exprList({
					type:     RType.BinaryOp,
					operator: op,
					lexeme:   op,
					location: rangeFrom(1, 3, 1, 3 + opOffset),
					info:     {},
					lhs:      {
						type:     RType.Number,
						location: rangeFrom(1, 1, 1, 1),
						content:  numVal(1),
						lexeme:   '1',
						info:     {}
					},
					rhs: {
						type:     RType.ExpressionList,
						location: undefined,
						lexeme:   undefined,
						info:     {},
						grouping: [{
							type:      RType.Symbol,
							location:  rangeFrom(1, 5 + opOffset, 1, 5 + opOffset),
							lexeme:    '(',
							content:   '(',
							info:      {},
							namespace: undefined
						}, {
							type:      RType.Symbol,
							location:  rangeFrom(1, 12 + 2*opOffset, 1, 12 + 2*opOffset),
							lexeme:    ')',
							content:   ')',
							info:      {},
							namespace: undefined
						}],
						children: [{
							type:     RType.BinaryOp,
							operator: op,
							lexeme:   op,
							location: rangeFrom(1, 8 + opOffset, 1, 8 + 2 * opOffset),
							info:     {},
							lhs:      {
								type:     RType.Number,
								location: rangeFrom(1, 6 + opOffset, 1, 6 + opOffset),
								content:  numVal(1),
								lexeme:   '1',
								info:     {}
							},
							rhs: {
								type:     RType.Number,
								location: rangeFrom(1, 10 + 2 * opOffset, 1, 11 + 2 * opOffset),
								content:  numVal(42),
								lexeme:   '42',
								info:     {}
							}
						}]
					}
				}), {
					ignoreAdditionalTokens: true
				})
		}
	})
}
