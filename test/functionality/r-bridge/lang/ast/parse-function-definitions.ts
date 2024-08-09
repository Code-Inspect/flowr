import { assertAst, withShell } from '../../../_helper/shell'
import { exprList, numVal, parameter } from '../../../_helper/ast-builder'
import { rangeFrom } from '../../../../../src/util/range'
import { label } from '../../../_helper/label'
import { RType } from '../../../../../src/r-bridge/lang-4.x/ast/model/type'
import { OperatorDatabase } from '../../../../../src/r-bridge/lang-4.x/ast/model/operators'

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
					grouping: [{
						type:      RType.Symbol,
						location:  rangeFrom(1, 12, 1, 12),
						lexeme:    '{',
						content:   '{',
						info:      {},
						namespace: undefined
					}, {
						type:      RType.Symbol,
						location:  rangeFrom(1, 14, 1, 14),
						lexeme:    '}',
						content:   '}',
						info:      {},
						namespace: undefined
					}],
					location: undefined,
					lexeme:   undefined,
					children: [],
					info:     {}
				}
			}), {
				ignoreAdditionalTokens: true
			}
		)
		assertAst(label('No Args', ['normal-definition', 'name-normal', 'numbers', 'grouping', ...OperatorDatabase['+'].capabilities, ...OperatorDatabase['*'].capabilities]),
			shell, 'function() { x + 2 * 3 }',exprList({
				type:       RType.FunctionDefinition,
				location:   rangeFrom(1, 1, 1, 8),
				lexeme:     'function',
				parameters: [],
				info:       {},
				body:       {
					type:     RType.ExpressionList,
					location: undefined,
					lexeme:   undefined,
					info:     {},
					grouping: [{
						type:      RType.Symbol,
						location:  rangeFrom(1, 12, 1, 12),
						lexeme:    '{',
						content:   '{',
						info:      {},
						namespace: undefined
					}, {
						type:      RType.Symbol,
						location:  rangeFrom(1, 24, 1, 24),
						lexeme:    '}',
						content:   '}',
						info:      {},
						namespace: undefined
					}],
					children: [{
						type:     RType.BinaryOp,
						location: rangeFrom(1, 16, 1, 16),
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
					}]
				}
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
					grouping: [{
						type:      RType.Symbol,
						location:  rangeFrom(1, 13, 1, 13),
						lexeme:    '{',
						content:   '{',
						info:      {},
						namespace: undefined
					}, {
						type:      RType.Symbol,
						location:  rangeFrom(1, 15, 1, 15),
						lexeme:    '}',
						content:   '}',
						info:      {},
						namespace: undefined
					}],
					location: undefined,
					lexeme:   undefined,
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
				body: {
					type:     RType.ExpressionList,
					location: undefined,
					lexeme:   undefined,
					info:     {},
					grouping: [{
						type:      RType.Symbol,
						location:  rangeFrom(1, 19, 1, 19),
						lexeme:    '{',
						content:   '{',
						info:      {},
						namespace: undefined
					}, {
						type:      RType.Symbol,
						location:  rangeFrom(1, 23, 1, 23),
						lexeme:    '}',
						content:   '}',
						info:      {},
						namespace: undefined
					}],
					children: [{
						type:      RType.Symbol,
						location:  rangeFrom(1, 21, 1, 21),
						lexeme:    'b',
						content:   'b',
						namespace: undefined,
						info:      {}
					}]
				}
			}), {
				ignoreAdditionalTokens: true
			}
		)
	})
	describe('With Special Parameters (...)', () => {
		assertAst(label('As Single Argument', ['normal-definition', 'formals-dot-dot-dot', 'grouping']),
			shell, 'function(...) { }', exprList({
				type:       RType.FunctionDefinition,
				location:   rangeFrom(1, 1, 1, 8),
				lexeme:     'function',
				parameters: [parameter('...', rangeFrom(1, 10, 1, 12), undefined, true)],
				info:       {},
				body:       {
					type:     RType.ExpressionList,
					grouping: [{
						type:      RType.Symbol,
						location:  rangeFrom(1, 15, 1, 15),
						lexeme:    '{',
						content:   '{',
						info:      {},
						namespace: undefined
					}, {
						type:      RType.Symbol,
						location:  rangeFrom(1, 17, 1, 17),
						lexeme:    '}',
						content:   '}',
						info:      {},
						namespace: undefined
					}],
					location: undefined,
					lexeme:   undefined,
					children: [],
					info:     {}
				}
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
					location: undefined,
					grouping: [{
						type:      RType.Symbol,
						location:  rangeFrom(1, 18, 1, 18),
						lexeme:    '{',
						content:   '{',
						info:      {},
						namespace: undefined
					}, {
						type:      RType.Symbol,
						location:  rangeFrom(1, 20, 1, 20),
						lexeme:    '}',
						content:   '}',
						info:      {},
						namespace: undefined
					}],
					lexeme:   undefined,
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
				body: {
					type:     RType.ExpressionList,
					location: undefined,
					lexeme:   undefined,
					info:     {},
					grouping: [{
						type:      RType.Symbol,
						location:  rangeFrom(1, 23, 1, 23),
						lexeme:    '{',
						content:   '{',
						info:      {},
						namespace: undefined
					}, {
						type:      RType.Symbol,
						location:  rangeFrom(1, 29, 1, 29),
						lexeme:    '}',
						content:   '}',
						info:      {},
						namespace: undefined
					}],
					children: [{
						type:      RType.Symbol,
						location:  rangeFrom(1, 25, 1, 27),
						lexeme:    '...',
						content:   '...',
						namespace: undefined,
						info:      {}
					}]
				}
			}), {
				ignoreAdditionalTokens: true
			}
		)
	})
	describe('With Named Parameters', () => {
		assertAst(label('One Parameter', ['normal-definition', 'formals-named', 'formals-default', 'grouping', 'name-normal', 'numbers']),
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
					grouping: [{
						type:      RType.Symbol,
						location:  rangeFrom(1, 15, 1, 15),
						lexeme:    '{',
						content:   '{',
						info:      {},
						namespace: undefined
					}, {
						type:      RType.Symbol,
						location:  rangeFrom(1, 17, 1, 17),
						lexeme:    '}',
						content:   '}',
						info:      {},
						namespace: undefined
					}],
					location: undefined,
					lexeme:   undefined,
					children: [],
					info:     {}
				}
			}), {
				ignoreAdditionalTokens: true
			}
		)

		assertAst(label('Multiple Parameter', ['normal-definition', 'formals-named', 'formals-default', 'grouping', 'name-normal', 'numbers', 'name-normal', 'strings']),
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
				body: {
					type:     RType.ExpressionList,
					lexeme:   undefined,
					location: undefined,
					info:     {},
					grouping: [{
						type:      RType.Symbol,
						location:  rangeFrom(1, 31, 1, 31),
						lexeme:    '{',
						content:   '{',
						info:      {},
						namespace: undefined
					}, {
						type:      RType.Symbol,
						location:  rangeFrom(1, 35, 1, 35),
						lexeme:    '}',
						content:   '}',
						info:      {},
						namespace: undefined
					}],
					children: [{
						type:      RType.Symbol,
						location:  rangeFrom(1, 33, 1, 33),
						lexeme:    'x',
						content:   'x',
						namespace: undefined,
						info:      {}
					}]
				}
			}), {
				ignoreAdditionalTokens: true
			}
		)
	})
})
)
