import { assertAst, withShell } from '../../../_helper/shell'
import { exprList, numVal } from '../../../_helper/ast-builder'
import type { SourceRange } from '../../../../../src/util/range'
import { addRanges, rangeFrom } from '../../../../../src/util/range'
import type { RExpressionList, RNode } from '../../../../../src'
import { ensureExpressionList, RType } from '../../../../../src'
import type { SupportedFlowrCapabilityId } from '../../../../../src/r-bridge/data'
import { label } from '../../../_helper/label'

interface IfThenSpacing {
	str:          string
	locationTrue: ReturnType<typeof rangeFrom>
	then:         RNode
	num:          number,
	locationNum:  ReturnType<typeof rangeFrom>
	end:          ReturnType<typeof rangeFrom>
	/* yes, we could give them just once, but if we ever want to modify the list this is more flexible */
	capabilities: SupportedFlowrCapabilityId[]
}

const IfThenSpacingVariants: IfThenSpacing[] = [
	{
		str:          'if(TRUE)1',
		locationTrue: rangeFrom(1, 4, 1, 7),
		then:         { type: RType.Number, location: rangeFrom(1, 9, 1, 9), lexeme: '1', content: numVal(1), info: {} },
		num:          1,
		locationNum:  rangeFrom(1, 9, 1, 9),
		end:          rangeFrom(1, 9, 1, 9),
		capabilities: ['if', 'logical', 'numbers']
	},
	{
		str:          'if(TRUE) 1',
		locationTrue: rangeFrom(1, 4, 1, 7),
		then:         { type: RType.Number, location: rangeFrom(1, 10, 1, 10), lexeme: '1', content: numVal(1), info: {} },
		num:          1,
		locationNum:  rangeFrom(1, 10, 1, 10),
		end:          rangeFrom(1, 10, 1, 10),
		capabilities: ['if', 'logical', 'numbers']
	},
	{
		str:          'if (TRUE) 1',
		locationTrue: rangeFrom(1, 5, 1, 8),
		num:          1,
		locationNum:  rangeFrom(1, 11, 1, 11),
		then:         { type: RType.Number, location: rangeFrom(1, 11, 1, 11), lexeme: '1', content: numVal(1), info: {} },
		end:          rangeFrom(1, 11, 1, 11),
		capabilities: ['if', 'logical', 'numbers']
	},
	{
		str:          'if     (TRUE)  42',
		locationTrue: rangeFrom(1, 9, 1, 12),
		num:          42,
		locationNum:  rangeFrom(1, 16, 1, 17),
		then:         { type: RType.Number, location: rangeFrom(1, 16, 1, 17), lexeme: '42', content: numVal(42), info: {} },
		end:          rangeFrom(1, 17, 1, 17),
		capabilities: ['if', 'logical', 'numbers']
	},
	{
		str:          'if\n(TRUE)1',
		locationTrue: rangeFrom(2, 2, 2, 5),
		num:          1,
		locationNum:  rangeFrom(2,7,2,7),
		then:         { type: RType.Number, location: rangeFrom(2, 7, 2, 7), lexeme: '1', content: numVal(1), info: {} },
		end:          rangeFrom(2, 7, 2, 7),
		capabilities: ['if', 'logical', 'numbers']
	},
	{
		str:          'if(TRUE)\n1',
		locationTrue: rangeFrom(1, 4, 1, 7),
		num:          1,
		locationNum:  rangeFrom(2,1,2,1),
		then:         { type: RType.Number, location: rangeFrom(2, 1, 2, 1), lexeme: '1', content: numVal(1), info: {} },
		end:          rangeFrom(2, 1, 2, 1),
		capabilities: ['if', 'logical', 'numbers']
	},
	{
		str:          'if\n(\nTRUE\n)\n1',
		locationTrue: rangeFrom(3, 1, 3, 4),
		num:          1,
		locationNum:  rangeFrom(5,1,5,1),
		then:         { type: RType.Number, location: rangeFrom(5, 1, 5, 1), lexeme: '1', content: numVal(1), info: {} },
		end:          rangeFrom(5, 1, 5, 1),
		capabilities: ['if', 'logical', 'numbers']
	},
]

function inBrace(start: SourceRange, end: SourceRange, content: RNode): RExpressionList {
	return {
		type:     RType.ExpressionList,
		location: undefined,
		lexeme:   undefined,
		info:     {},
		grouping: [{
			type:      RType.Symbol,
			lexeme:    '{',
			content:   '{',
			info:      {},
			namespace: undefined,
			location:  start
		}, {
			type:      RType.Symbol,
			lexeme:    '}',
			content:   '}',
			info:      {},
			namespace: undefined,
			location:  end
		}],
		children: [content]
	}
}

const IfThenBraceVariants: IfThenSpacing[] = [{
	str:          'if(TRUE){1}',
	locationTrue: rangeFrom(1, 4, 1, 7),
	num:          1,
	locationNum:  rangeFrom(1,10,1,10),
	then:         inBrace(rangeFrom(1, 9, 1, 9), rangeFrom(1, 11, 1, 11), { type: RType.Number, location: rangeFrom(1, 10, 1, 10), lexeme: '1', content: numVal(1), info: {} }),
	end:          rangeFrom(1, 11, 1, 11),
	capabilities: ['if', 'logical', 'numbers', 'grouping']
}, {
	str:          'if(TRUE){42}',
	locationTrue: rangeFrom(1, 4, 1, 7),
	locationNum:  rangeFrom(1, 10, 1, 11),
	then:         inBrace(rangeFrom(1, 9, 1, 9), rangeFrom(1, 12, 1, 12), { type: RType.Number, location: rangeFrom(1, 10, 1, 11), lexeme: '42', content: numVal(42), info: {} }),
	num:          42,
	end:          rangeFrom(1, 12, 1, 12),
	capabilities: ['if', 'logical', 'numbers', 'grouping']
}, {
	str:          'if(TRUE){{{1}}}',
	locationTrue: rangeFrom(1, 4, 1, 7),
	locationNum:  rangeFrom(1, 12, 1, 12),
	then:         inBrace(rangeFrom(1, 9, 1, 9), rangeFrom(1, 15, 1, 15),
		inBrace(rangeFrom(1, 10, 1, 10), rangeFrom(1, 14, 1, 14),
			inBrace(rangeFrom(1, 11, 1, 11), rangeFrom(1, 13, 1, 13),
				{ type: RType.Number, location: rangeFrom(1, 12, 1, 12), lexeme: '1', content: numVal(1), info: {} }
			)
		)
	),
	num:          1,
	end:          rangeFrom(1, 15, 1, 15),
	capabilities: ['if', 'logical', 'numbers', 'grouping']
}]

interface ElseSpacing {
	str:          string
	locationElse: ReturnType<typeof rangeFrom>
	otherwise:    (offset: SourceRange) => RNode,
	num:          number,
	capabilities: SupportedFlowrCapabilityId[]
}

// suffix of if-then counterparts
const ElseSpacingVariants: ElseSpacing[] = [{
	/* one space/newline around is the minimum for R */
	str:          ' else 2',
	locationElse: rangeFrom(0, 7, 0, 7),
	num:          2,
	otherwise:    off => ({ type: RType.Number, location: addRanges(off, rangeFrom(0, 7, 0, 7)), lexeme: '2', content: numVal(2), info: {} }),
	capabilities: ['if', 'numbers']
}, {
	str:          ' else  9',
	locationElse: rangeFrom(0, 8, 0, 8),
	num:          9,
	otherwise:    off => ({ type: RType.Number, location: addRanges(off, rangeFrom(0, 8, 0, 8)), lexeme: '9', content: numVal(9), info: {} }),
	capabilities: ['if', 'numbers']
}]

const ElsegroupingVariants: ElseSpacing[] = [{
	str:          ' else {2}',
	locationElse: rangeFrom(0, 8, 0, 8),
	otherwise: 	  off => inBrace(
		addRanges(off, rangeFrom(0, 7, 0, 7)), addRanges(off, rangeFrom(0, 9, 0, 9)),
		{ type: RType.Number, location: addRanges(off, rangeFrom(0, 8, 0, 8)), lexeme: '2', content: numVal(2), info: {} }
	),
	num:          2,
	capabilities: ['if', 'numbers', 'grouping']
}, {
	str:          ' else {{{42}}}',
	locationElse: rangeFrom(0, 10, 0, 11),
	otherwise:    off => inBrace(addRanges(off, rangeFrom(0, 7, 0, 7)), addRanges(off, rangeFrom(0, 14, 0, 14)),
		inBrace(addRanges(off, rangeFrom(0, 8, 0, 8)), addRanges(off, rangeFrom(0, 13, 0, 13)),
			inBrace(addRanges(off, rangeFrom(0, 9, 0, 9)), addRanges(off, rangeFrom(0, 12, 0, 12)),
				{ type: RType.Number, location: addRanges(off, rangeFrom(0, 10, 0, 11)), lexeme: '42', content: numVal(42), info: {} }
			)
		)
	),
	num:          42,
	capabilities: ['if', 'numbers', 'grouping']
}]

describe('Parse simple constructs', withShell(shell => {
	describe('if', () => {
		describe('if-then', () => {
			for(const pool of [{ name: 'grouping', variants: IfThenBraceVariants }, {
				name:     'spacing',
				variants: IfThenSpacingVariants
			}]) {
				describe(`${pool.name} variants`, () => {
					for(const variant of pool.variants) {
						assertAst(label(JSON.stringify(variant.str), variant.capabilities), shell, variant.str, exprList({
							type:      RType.IfThenElse,
							location:  rangeFrom(1, 1, 1, 2),
							lexeme:    'if',
							info:      {},
							condition: {
								type:     RType.Logical,
								location: variant.locationTrue,
								lexeme:   'TRUE',
								content:  true,
								info:     {}
							},
							then: ensureExpressionList(variant.then)
						}), {
							ignoreAdditionalTokens: true
						})
					}
				})
			}
		})
		describe('if-then-else', () => {
			for(const elsePool of [{ name: 'grouping', variants: ElsegroupingVariants }, {
				name:     'spacing',
				variants: ElseSpacingVariants
			}]) {
				for(const ifThenPool of [{ name: 'grouping', variants: IfThenBraceVariants }, {
					name:     'spacing',
					variants: IfThenSpacingVariants
				}]) {
					describe(`if-then: ${ifThenPool.name}, else: ${elsePool.name}`, () => {
						for(const elseVariant of elsePool.variants) {
							for(const ifThenVariant of ifThenPool.variants) {
								const input = `${ifThenVariant.str}${elseVariant.str}`
								assertAst(label(JSON.stringify(input), [...ifThenVariant.capabilities, ...elseVariant.capabilities]), shell, input, exprList({
									type:      RType.IfThenElse,
									location:  rangeFrom(1, 1, 1, 2),
									lexeme:    'if',
									info:      {},
									condition: {
										type:     RType.Logical,
										location: ifThenVariant.locationTrue,
										lexeme:   'TRUE',
										content:  true,
										info:     {}
									},
									then:      ensureExpressionList(ifThenVariant.then),
									otherwise: ensureExpressionList(elseVariant.otherwise(ifThenVariant.end))
								}), {
									ignoreAdditionalTokens: true
								})
							}
						}
					})
				}
			}
		})
	})
	describe('loops', () => {
		describe('for', () => {
			assertAst(label('for(i in 1:10) 2', ['for-loop', 'name-normal', 'numbers', 'built-in-sequencing']), shell, 'for(i in 1:42)2',
				exprList({
					type:     RType.ForLoop,
					location: rangeFrom(1, 1, 1, 3),
					lexeme:   'for',
					info:     {},
					variable: {
						type:      RType.Symbol,
						location:  rangeFrom(1, 5, 1, 5),
						namespace: undefined,
						lexeme:    'i',
						content:   'i',
						info:      {}
					},
					vector: {
						type:     RType.BinaryOp,
						operator: ':',
						location: rangeFrom(1, 11, 1, 11),
						lexeme:   ':',
						info:     {},
						lhs:      {
							type:     RType.Number,
							location: rangeFrom(1, 10, 1, 10),
							lexeme:   '1',
							content:  numVal(1),
							info:     {}
						},
						rhs: {
							type:     RType.Number,
							location: rangeFrom(1, 12, 1, 13),
							lexeme:   '42',
							content:  numVal(42),
							info:     {}
						}
					},
					body: ensureExpressionList({
						type:     RType.Number,
						location: rangeFrom(1, 15, 1, 15),
						lexeme:   '2',
						content:  numVal(2),
						info:     {}
					})
				}), {
					ignoreAdditionalTokens: true
				}
			)
			assertAst(label('for-loop with comment', ['for-loop', 'name-normal', 'numbers', 'built-in-sequencing', 'comments', 'newlines']), shell, `for(#a
				i#b
				in#c
				1:42#d
			)
			2`,exprList({
				type:     RType.ForLoop,
				location: rangeFrom(1, 1, 1, 3),
				lexeme:   'for',
				info:     {},
				variable: {
					type:      RType.Symbol,
					location:  rangeFrom(2, 33, 2, 33),
					namespace: undefined,
					lexeme:    'i',
					content:   'i',
					info:      {}
				},
				vector: {
					type:     RType.BinaryOp,
					operator: ':',
					location: rangeFrom(4, 34, 4, 34),
					lexeme:   ':',
					info:     {},
					lhs:      {
						type:     RType.Number,
						location: rangeFrom(4, 33, 4, 33),
						lexeme:   '1',
						content:  numVal(1),
						info:     {}
					},
					rhs: {
						type:     RType.Number,
						location: rangeFrom(4, 35, 4, 36),
						lexeme:   '42',
						content:  numVal(42),
						info:     {}
					}
				},
				body: ensureExpressionList({
					type:     RType.Number,
					location: rangeFrom(6, 25, 6, 25),
					lexeme:   '2',
					content:  numVal(2),
					info:     {}
				})
			})	, {
				ignoreAdditionalTokens: true
			}
			)
		})
		describe('repeat', () => {
			assertAst(label('Single instruction repeat', ['repeat-loop', 'numbers']),
				shell, 'repeat 2', exprList({
					type:     RType.RepeatLoop,
					location: rangeFrom(1, 1, 1, 6),
					lexeme:   'repeat',
					info:     {},
					body:     ensureExpressionList({
						type:     RType.Number,
						location: rangeFrom(1, 8, 1, 8),
						lexeme:   '2',
						content:  numVal(2),
						info:     {}
					})
				}), {
					ignoreAdditionalTokens: true
				})
			assertAst(label('Two Statement Repeat', ['repeat-loop', 'numbers', 'grouping', 'semicolons']),
				shell, 'repeat { x; y }', exprList({
					type:     RType.RepeatLoop,
					location: rangeFrom(1, 1, 1, 6),
					lexeme:   'repeat',
					info:     {},
					body:     {
						type:     RType.ExpressionList,
						location: undefined,
						lexeme:   undefined,
						grouping: [{
							type:      RType.Symbol,
							lexeme:    '{',
							content:   '{',
							info:      {},
							namespace: undefined,
							location:  rangeFrom(1, 8, 1, 8)
						}, {
							type:      RType.Symbol,
							lexeme:    '}',
							content:   '}',
							info:      {},
							namespace: undefined,
							location:  rangeFrom(1, 15, 1, 15)
						}],
						info:     {},
						children: [{
							type:      RType.Symbol,
							location:  rangeFrom(1, 10, 1, 10),
							namespace: undefined,
							lexeme:    'x',
							content:   'x',
							info:      {},
						}, {
							type:      RType.Symbol,
							location:  rangeFrom(1, 13, 1, 13),
							namespace: undefined,
							lexeme:    'y',
							content:   'y',
							info:      {}
						}]
					}
				}), {
					ignoreAdditionalTokens: true
				})
		})
		describe('while', () => {
			assertAst(label('while (TRUE) 42', ['while-loop', 'logical', 'numbers']),
				shell, 'while (TRUE) 42', exprList({
					type:      RType.WhileLoop,
					location:  rangeFrom(1, 1, 1, 5),
					lexeme:    'while',
					info:      {},
					condition: {
						type:     RType.Logical,
						location: rangeFrom(1, 8, 1, 11),
						lexeme:   'TRUE',
						content:  true,
						info:     {}
					},
					body: ensureExpressionList({
						type:     RType.Number,
						location: rangeFrom(1, 14, 1, 15),
						lexeme:   '42',
						content:  numVal(42),
						info:     {}
					})
				}), {
					ignoreAdditionalTokens: true
				})

			assertAst(label('Two statement while', ['while-loop', 'logical', 'grouping', 'semicolons']),
				shell, 'while (FALSE) { x; y }', exprList({
					type:      RType.WhileLoop,
					location:  rangeFrom(1, 1, 1, 5),
					lexeme:    'while',
					info:      {},
					condition: {
						type:     RType.Logical,
						location: rangeFrom(1, 8, 1, 12),
						lexeme:   'FALSE',
						content:  false,
						info:     {}
					},
					body: {
						type:     RType.ExpressionList,
						location: undefined,
						lexeme:   undefined,
						grouping: [{
							type:      RType.Symbol,
							lexeme:    '{',
							content:   '{',
							info:      {},
							namespace: undefined,
							location:  rangeFrom(1, 15, 1, 15)
						}, {
							type:      RType.Symbol,
							lexeme:    '}',
							content:   '}',
							info:      {},
							namespace: undefined,
							location:  rangeFrom(1, 22, 1, 22)
						}],
						info:     {},
						children: [{
							type:      RType.Symbol,
							location:  rangeFrom(1, 17, 1, 17),
							namespace: undefined,
							lexeme:    'x',
							content:   'x',
							info:      {}
						}, {
							type:      RType.Symbol,
							location:  rangeFrom(1, 20, 1, 20),
							namespace: undefined,
							lexeme:    'y',
							content:   'y',
							info:      {}
						}]
					}
				}), {
					ignoreAdditionalTokens: true
				})
		})
		describe('break', () => {
			assertAst(label('while (TRUE) break', ['while-loop', 'logical', 'break']),
				shell, 'while (TRUE) break', exprList({
					type:      RType.WhileLoop,
					location:  rangeFrom(1, 1, 1, 5),
					lexeme:    'while',
					info:      {},
					condition: {
						type:     RType.Logical,
						location: rangeFrom(1, 8, 1, 11),
						lexeme:   'TRUE',
						content:  true,
						info:     {}
					},
					body: ensureExpressionList({
						type:     RType.Break,
						location: rangeFrom(1, 14, 1, 18),
						lexeme:   'break',
						info:     {}
					})
				})
			)
		})
		describe('next', () => {
			assertAst(label('Next in while', ['while-loop', 'next']),
				shell, 'while (TRUE) next', exprList({
					type:      RType.WhileLoop,
					location:  rangeFrom(1, 1, 1, 5),
					lexeme:    'while',
					info:      {},
					condition: {
						type:     RType.Logical,
						location: rangeFrom(1, 8, 1, 11),
						lexeme:   'TRUE',
						content:  true,
						info:     {}
					},
					body: ensureExpressionList({
						type:     RType.Next,
						location: rangeFrom(1, 14, 1, 17),
						lexeme:   'next',
						info:     {}
					})
				})
			)
		})
	})
}))
