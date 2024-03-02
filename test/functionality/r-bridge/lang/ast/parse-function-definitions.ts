import { assertAst, withShell } from '../../../_helper/shell'
import { exprList, numVal, parameter } from '../../../_helper/ast-builder'
import { rangeFrom } from '../../../../../src/util/range'
import { RType } from '../../../../../src'
import { ensureExpressionList } from '../../../../../src/r-bridge/lang-4.x/ast/parser/xml/v1/internal'
import { label } from '../../../_helper/label'

describe('Parse function definitions', withShell(shell => {
	describe('without parameters', () => {
		assertAst(label('Noop', ['normal-definition', 'grouping']),
			shell, 'function() { }', exprList({
				type:       RType.FunctionDefinition,
				location:   rangeFrom(1, 1, 1, 8),
				lexeme:     'function',
				parameters: [],
				info:       {},
				body:       {
					type:     RType.ExpressionList,
					location: rangeFrom(1, 12, 1, 14),
					lexeme:   '{ }',
					children: [],
					info:     {}
				}
			}), {
				ignoreAdditionalTokens: true
			}
		)
		assertAst(label('No Args', ['normal-definition', 'name-normal', 'binary-operator', 'infix-calls', 'function-calls', 'numbers', 'grouping']),
			shell, 'function() { x + 2 * 3 }',exprList({
				type:       RType.FunctionDefinition,
				location:   rangeFrom(1, 1, 1, 8),
				lexeme:     'function',
				parameters: [],
				info:       {},
				body:       ensureExpressionList({
					type:     RType.BinaryOp,
					location: rangeFrom(1, 16, 1, 16),
					flavor:   'arithmetic',
					lexeme:   '+',
					operator: '+',
					info:     {},
					lhs:      {
						type:      RType.Symbol,
						location:  rangeFrom(1, 14, 1, 14),
						lexeme:    'x',
						content:   'x',
						namespace: undefined,
						info:      {}
					},
					rhs: {
						type:     RType.BinaryOp,
						location: rangeFrom(1, 20, 1, 20),
						flavor:   'arithmetic',
						lexeme:   '*',
						operator: '*',
						info:     {},
						lhs:      {
							type:     RType.Number,
							location: rangeFrom(1, 18, 1, 18),
							lexeme:   '2',
							content:  numVal(2),
							info:     {}
						},
						rhs: {
							type:     RType.Number,
							location: rangeFrom(1, 22, 1, 22),
							lexeme:   '3',
							content:  numVal(3),
							info:     {}
						}
					}
				})
			}), {
				ignoreAdditionalTokens: true
			}
		)
	})
	describe('with unnamed parameters', () => {
		assertAst(label('One parameter', ['normal-definition', 'formals-named', 'grouping']),
			shell, 'function(x) { }', exprList({
				type:       RType.FunctionDefinition,
				location:   rangeFrom(1, 1, 1, 8),
				lexeme:     'function',
				parameters: [parameter('x', rangeFrom(1, 10, 1, 10))],
				info:       {},
				body:       {
					type:     RType.ExpressionList,
					location: rangeFrom(1, 13, 1, 15),
					lexeme:   '{ }',
					children: [],
					info:     {}
				}
			}), {
				ignoreAdditionalTokens: true
			}
		)
		assertAst(label('Multiple parameters', ['normal-definition', 'name-normal', 'formals-named', 'grouping']),
			shell, 'function(a,the,b) { b }', exprList({
				type:       RType.FunctionDefinition,
				location:   rangeFrom(1, 1, 1, 8),
				lexeme:     'function',
				parameters: [
					parameter('a', rangeFrom(1, 10, 1, 10)),
					parameter('the', rangeFrom(1, 12, 1, 14)),
					parameter('b', rangeFrom(1, 16, 1, 16))
				],
				info: {},
				body: ensureExpressionList({
					type:      RType.Symbol,
					location:  rangeFrom(1, 21, 1, 21),
					lexeme:    'b',
					content:   'b',
					namespace: undefined,
					info:      {}
				})
			}), {
				ignoreAdditionalTokens: true
			}
		)
	})
	describe('with special parameters (...)', () => {
		assertAst(label('As single arg', ['normal-definition', 'formals-dot-dot-dot', 'grouping']),
			shell, 'function(...) { }', exprList({
				type:       RType.FunctionDefinition,
				location:   rangeFrom(1, 1, 1, 8),
				lexeme:     'function',
				parameters: [parameter('...', rangeFrom(1, 10, 1, 12), undefined, true)],
				info:       {},
				body:       ensureExpressionList({
					type:     RType.ExpressionList,
					location: rangeFrom(1, 15, 1, 17),
					lexeme:   '{ }',
					children: [],
					info:     {}
				})
			}), {
				ignoreAdditionalTokens: true
			}
		)

		assertAst(label('As first arg', ['normal-definition', 'formals-dot-dot-dot', 'grouping', 'formals-named']),
			shell, 'function(..., a) { }', exprList({
				type:       RType.FunctionDefinition,
				location:   rangeFrom(1, 1, 1, 8),
				lexeme:     'function',
				parameters: [
					parameter('...', rangeFrom(1, 10, 1, 12), undefined, true),
					parameter('a', rangeFrom(1, 15, 1, 15))
				],
				info: {},
				body: {
					type:     RType.ExpressionList,
					location: rangeFrom(1, 18, 1, 20),
					lexeme:   '{ }',
					children: [],
					info:     {}
				}
			}), {
				ignoreAdditionalTokens: true
			}
		)

		assertAst(label('As last arg', ['normal-definition', 'formals-dot-dot-dot', 'grouping', 'formals-named', 'name-normal']),
			shell, 'function(a, the, ...) { ... }', exprList({
				type:       RType.FunctionDefinition,
				location:   rangeFrom(1, 1, 1, 8),
				lexeme:     'function',
				parameters: [
					parameter('a', rangeFrom(1, 10, 1, 10)),
					parameter('the', rangeFrom(1, 13, 1, 15)),
					parameter('...', rangeFrom(1, 18, 1, 20), undefined, true)
				],
				info: {},
				body: ensureExpressionList({
					type:      RType.Symbol,
					location:  rangeFrom(1, 25, 1, 27),
					lexeme:    '...',
					content:   '...',
					namespace: undefined,
					info:      {}
				})
			}), {
				ignoreAdditionalTokens: true
			}
		)
	})
	describe('With named parameters', () => {
		assertAst(label('one parameter', ['normal-definition', 'formals-named', 'formals-default', 'grouping', 'name-normal', 'numbers']),
			shell, 'function(x=3) { }', exprList({
				type:       RType.FunctionDefinition,
				location:   rangeFrom(1, 1, 1, 8),
				lexeme:     'function',
				parameters: [
					parameter('x', rangeFrom(1, 10, 1, 10), {
						type:     RType.Number,
						location: rangeFrom(1, 12, 1, 12),
						lexeme:   '3',
						content:  numVal(3),
						info:     {}
					})
				],
				info: {},
				body: {
					type:     RType.ExpressionList,
					location: rangeFrom(1, 15, 1, 17),
					lexeme:   '{ }',
					children: [],
					info:     {}
				}
			}), {
				ignoreAdditionalTokens: true
			}
		)

		assertAst(label('multiple parameter', ['normal-definition', 'formals-named', 'formals-default', 'grouping', 'name-normal', 'numbers', 'name-normal', 'strings']),
			shell, 'function(a, x=3, huhu="hehe") { x }', exprList({
				type:       RType.FunctionDefinition,
				location:   rangeFrom(1, 1, 1, 8),
				lexeme:     'function',
				parameters: [
					parameter('a', rangeFrom(1, 10, 1, 10)),
					parameter('x', rangeFrom(1, 13, 1, 13), {
						type:     RType.Number,
						location: rangeFrom(1, 15, 1, 15),
						lexeme:   '3',
						content:  numVal(3),
						info:     {}
					}),
					parameter('huhu', rangeFrom(1, 18, 1, 21), {
						type:     RType.String,
						location: rangeFrom(1, 23, 1, 28),
						lexeme:   '"hehe"',
						content:  { str: 'hehe', quotes: '"' },
						info:     {}
					})
				],
				info: {},
				body: ensureExpressionList({
					type:      RType.Symbol,
					location:  rangeFrom(1, 33, 1, 33),
					lexeme:    'x',
					content:   'x',
					namespace: undefined,
					info:      {}
				})
			}), {
				ignoreAdditionalTokens: true
			}
		)
	})
})
)
