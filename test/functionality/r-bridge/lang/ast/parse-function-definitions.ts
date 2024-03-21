import { assertAst, withShell } from '../../../_helper/shell'
import { exprList, numVal, parameter } from '../../../_helper/ast-builder'
import { rangeFrom } from '../../../../../src/util/range'
import { RType } from '../../../../../src/r-bridge'
import { ensureExpressionList } from '../../../../../src/r-bridge/lang-4.x/ast/parser/xml/internal'

describe('Parse function definitions', withShell((shell) => {
	describe('without parameters', () => {
		const noop = 'function() { }'
		assertAst(`noop - ${noop}`, shell, noop,
			exprList({
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
		const noArgs = 'function() { x + 2 * 3 }'
		assertAst(`noArgs - ${noArgs}`, shell, noArgs,
			exprList({
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
		const oneParameter = 'function(x) { }'
		assertAst(`one parameter - ${oneParameter}`, shell, oneParameter,
			exprList({
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
		const multipleParameters = 'function(a,the,b) { b }'
		assertAst(`multiple parameters - ${multipleParameters}`, shell, multipleParameters,
			exprList({
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
		const asSingleParameter = 'function(...) { }'
		assertAst(`as single arg - ${asSingleParameter}`, shell, asSingleParameter,
			exprList({
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

		const asFirstParameters = 'function(..., a) { }'
		assertAst(`as first arg - ${asFirstParameters}`, shell, asFirstParameters,
			exprList({
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

		const asLastParameter = 'function(a, the, ...) { ... }'
		assertAst(`as last arg - ${asLastParameter}`, shell, asLastParameter,
			exprList({
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
	describe('with named parameters', () => {
		const oneParameter = 'function(x=3) { }'
		assertAst(`one parameter - ${oneParameter}`, shell, oneParameter,
			exprList({
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

		const multipleParameters = 'function(a, x=3, huhu="hehe") { x }'
		assertAst(`multiple parameter - ${multipleParameters}`, shell, multipleParameters,
			exprList({
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
