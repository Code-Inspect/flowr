import { assertDecoratedAst, retrieveNormalizedAst, withShell } from '../_helper/shell'
import { numVal } from '../_helper/ast-builder'
import { rangeFrom } from '../../../src/util/range'
import type { RNodeWithParent, NodeId } from '../../../src'
import { RType, decorateAst, collectAllIds, RoleInParent } from '../../../src'
import { assert } from 'chai'

describe('Assign unique Ids and Parents', withShell((shell) => {
	describe('Testing deterministic counting Id assignment', () => {
		const assertDecorated = (name: string, input: string, expected: RNodeWithParent): void => {
			assertDecoratedAst(name, shell, input, expected)
		}
		// decided to test with ast parsing, as we are dependent on these changes in reality
		describe('Single nodes (leafs)', () => {
			const exprList = (...children: readonly RNodeWithParent[]): RNodeWithParent => ({
				type:     RType.ExpressionList,
				lexeme:   undefined,
				grouping: undefined,
				info:     {
					parent: undefined,
					id:     '1',
					index:  0,
					role:   RoleInParent.Root
				},
				children,
			})
			assertDecorated('String', '"hello"',
				exprList({
					type:     RType.String,
					location: rangeFrom(1, 1, 1, 7),
					lexeme:   '"hello"',
					content:  {
						str:    'hello',
						quotes: '"',
					},
					info: {
						parent: '1',
						id:     '0',
						role:   RoleInParent.ExpressionListChild,
						index:  0,
					},
				})
			)
			assertDecorated('Number', '42',
				exprList({
					type:     RType.Number,
					location: rangeFrom(1, 1, 1, 2),
					lexeme:   '42',
					content:  numVal(42),
					info:     {
						parent: '1',
						id:     '0',
						role:   RoleInParent.ExpressionListChild,
						index:  0
					},
				})
			)
			assertDecorated('Logical', 'FALSE',
				exprList({
					type:     RType.Logical,
					location: rangeFrom(1, 1, 1, 5),
					lexeme:   'FALSE',
					content:  false,
					info:     {
						parent: '1',
						id:     '0',
						role:   RoleInParent.ExpressionListChild,
						index:  0
					},
				})
			)
			assertDecorated('Symbol', 'k',
				exprList({
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					namespace: undefined,
					lexeme:    'k',
					content:   'k',
					info:      {
						parent: '1',
						id:     '0',
						role:   RoleInParent.ExpressionListChild,
						index:  0
					},
				})
			)
		})
	})
	describe('Collect all íds in ast', () => {
		function assertIds(name: string, input: string, expected: Set<NodeId>, stop?: (node: RNodeWithParent) => boolean) {
			it(name, async() => {
				const baseAst = await retrieveNormalizedAst(shell, input)
				const ast = decorateAst(baseAst)
				const ids = collectAllIds(ast.ast, stop)
				assert.deepStrictEqual(ids, expected, `Ids do not match for input ${input}`)
			})
		}
		assertIds('Without stop', 'x <- 2', new Set(['0', '1', '2', '3']))
		assertIds('Stop one', 'x <- 2', new Set(['0', '2', '3']), n => n.type === RType.Number)
		assertIds('Multiple statements', 'x <- 2; if(TRUE) { a <- 4 }', new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']))
		// if, TRUE, [when]
		assertIds('Multiple statements blocking binary ops', 'x <- 2; if(TRUE) { a <- 4 }', new Set(['3', '7', '8', '9']), n => n.type === RType.BinaryOp)
	})
})
)
