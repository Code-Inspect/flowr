import { assertAst, withShell } from '../../../_helper/shell'
import { exprList, numVal } from '../../../_helper/ast-builder'
import { rangeFrom } from '../../../../../src/util/range'
import { label } from '../../../_helper/label'
import { RType } from '../../../../../src/r-bridge/lang-4.x/ast/model/type'
import { OperatorDatabase } from '../../../../../src/r-bridge/lang-4.x/ast/model/operators'
import { EmptyArgument } from '../../../../../src/r-bridge/lang-4.x/ast/model/nodes/r-function-call'

describe('Parse value access', withShell(shell => {
	describe('Single bracket', () => {
		assertAst(label('Empty Access', ['name-normal', 'single-bracket-access', 'access-with-empty']),
			shell, 'a[]', exprList({
				type:     RType.Access,
				location: rangeFrom(1, 2, 1, 2),
				lexeme:   '[',
				operator: '[',
				info:     {},
				accessed: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					namespace: undefined,
					lexeme:    'a',
					content:   'a',
					info:      {}
				},
				access: []
			})
		)
		assertAst(label('One Constant', ['name-normal', 'single-bracket-access', 'numbers']),
			shell, 'a[1]', exprList({
				type:     RType.Access,
				location: rangeFrom(1, 2, 1, 2),
				lexeme:   '[',
				operator: '[',
				info:     {},
				accessed: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					namespace: undefined,
					lexeme:    'a',
					content:   'a',
					info:      {}
				},
				access: [{
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
				}]
			})
		)
		assertAst(label('One Variable', ['name-normal', 'single-bracket-access']),
			shell, 'a[x]', exprList({
				type:     RType.Access,
				location: rangeFrom(1, 2, 1, 2),
				lexeme:   '[',
				operator: '[',
				info:     {},
				accessed: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					namespace: undefined,
					lexeme:    'a',
					content:   'a',
					info:      {}
				},
				access: [{
					type:     RType.Argument,
					location: rangeFrom(1, 3, 1, 3),
					lexeme:   'x',
					name:     undefined,
					info:     {},
					value:    {
						type:      RType.Symbol,
						location:  rangeFrom(1, 3, 1, 3),
						namespace: undefined,
						lexeme:    'x',
						content:   'x',
						info:      {}
					}
				}]
			})
		)
		assertAst(label('One Expression', ['name-normal', 'single-bracket-access', 'binary-operator', 'infix-calls', 'function-calls', 'numbers', ...OperatorDatabase['-'].capabilities]),
			shell, 'a[x + 3]', exprList({
				type:     RType.Access,
				location: rangeFrom(1, 2, 1, 2),
				lexeme:   '[',
				operator: '[',
				info:     {},
				accessed: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					namespace: undefined,
					lexeme:    'a',
					content:   'a',
					info:      {}
				},
				access: [{
					type:     RType.Argument,
					location: rangeFrom(1, 3, 1, 7),
					lexeme:   'x + 3',
					name:     undefined,
					info:     {},
					value:    {
						type:     RType.BinaryOp,
						location: rangeFrom(1, 5, 1, 5),
						operator: '+',
						lexeme:   '+',
						info:     {},
						lhs:      {
							type:      RType.Symbol,
							location:  rangeFrom(1, 3, 1, 3),
							namespace: undefined,
							lexeme:    'x',
							content:   'x',
							info:      {}
						},
						rhs: {
							type:     RType.Number,
							location: rangeFrom(1, 7, 1, 7),
							lexeme:   '3',
							content:  numVal(3),
							info:     {}
						}
					}
				}]
			})
		)
		assertAst(label('Multiple Access', ['name-normal', 'single-bracket-access', 'numbers']),
			shell, 'a[3,2]', exprList({
				type:     RType.Access,
				location: rangeFrom(1, 2, 1, 2),
				lexeme:   '[',
				operator: '[',
				info:     {},
				accessed: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					namespace: undefined,
					lexeme:    'a',
					content:   'a',
					info:      {}
				},
				access: [{
					type:     RType.Argument,
					location: rangeFrom(1, 3, 1, 3),
					lexeme:   '3',
					name:     undefined,
					info:     {},
					value:    {
						type:     RType.Number,
						location: rangeFrom(1, 3, 1, 3),
						lexeme:   '3',
						content:  numVal(3),
						info:     {}
					}
				}, {
					type:     RType.Argument,
					location: rangeFrom(1, 5, 1, 5),
					lexeme:   '2',
					name:     undefined,
					info:     {},
					value:    {
						type:     RType.Number,
						location: rangeFrom(1, 5, 1, 5),
						lexeme:   '2',
						content:  numVal(2),
						info:     {}
					}
				}]
			})
		)
		assertAst(label('Multiple with Empty', ['name-normal', 'single-bracket-access', 'numbers', 'access-with-empty']),
			shell, 'a[,2,4]', exprList({
				type:     RType.Access,
				location: rangeFrom(1, 2, 1, 2),
				lexeme:   '[',
				operator: '[',
				info:     {},
				accessed: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					namespace: undefined,
					lexeme:    'a',
					content:   'a',
					info:      {}
				},
				access: [EmptyArgument, {
					type:     RType.Argument,
					location: rangeFrom(1, 4, 1, 4),
					lexeme:   '2',
					name:     undefined,
					info:     {},
					value:    {
						type:     RType.Number,
						location: rangeFrom(1, 4, 1, 4),
						lexeme:   '2',
						content:  numVal(2),
						info:     {}
					}
				}, {
					type:     RType.Argument,
					location: rangeFrom(1, 6, 1, 6),
					lexeme:   '4',
					name:     undefined,
					info:     {},
					value:    {
						type:     RType.Number,
						location: rangeFrom(1, 6, 1, 6),
						lexeme:   '4',
						content:  numVal(4),
						info:     {}
					}
				}]
			}))
		assertAst(label('Named argument', ['name-normal', 'single-bracket-access', 'numbers', 'access-with-argument-names']),
			shell, 'a[1,super=4]', exprList({
				type:     RType.Access,
				location: rangeFrom(1, 2, 1, 2),
				lexeme:   '[',
				operator: '[',
				info:     {},
				accessed: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					namespace: undefined,
					lexeme:    'a',
					content:   'a',
					info:      {}
				},
				access: [{
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
				}, {
					type:     RType.Argument,
					location: rangeFrom(1, 5, 1, 9),
					lexeme:   'super',
					name:     {
						type:      RType.Symbol,
						location:  rangeFrom(1, 5, 1, 9),
						namespace: undefined,
						lexeme:    'super',
						content:   'super',
						info:      {}
					},
					info:  {},
					value: {
						type:     RType.Number,
						location: rangeFrom(1, 11, 1, 11),
						lexeme:   '4',
						content:  numVal(4),
						info:     {}
					}
				}]
			})
		)
		assertAst(label('Chained', ['name-normal', 'single-bracket-access', 'numbers']),
			shell, 'a[1][4]', exprList({
				type:     RType.Access,
				location: rangeFrom(1, 5, 1, 5),
				lexeme:   '[',
				operator: '[',
				info:     {},
				accessed: {
					type:     RType.Access,
					location: rangeFrom(1, 2, 1, 2),
					lexeme:   '[',
					operator: '[',
					info:     {},
					accessed: {
						type:      RType.Symbol,
						location:  rangeFrom(1, 1, 1, 1),
						namespace: undefined,
						lexeme:    'a',
						content:   'a',
						info:      {}
					},
					access: [{
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
					}]
				},
				access: [{
					type:     RType.Argument,
					location: rangeFrom(1, 6, 1, 6),
					lexeme:   '4',
					name:     undefined,
					info:     {},
					value:    {
						type:     RType.Number,
						location: rangeFrom(1, 6, 1, 6),
						lexeme:   '4',
						content:  numVal(4),
						info:     {}
					}
				}]
			})
		)
	})
	describe('Double bracket', () => {
		assertAst(label('Empty', ['name-normal', 'double-bracket-access', 'access-with-empty']),
			shell, 'b[[]]', exprList({
				type:     RType.Access,
				location: rangeFrom(1, 2, 1, 3),
				lexeme:   '[[',
				operator: '[[',
				info:     {},
				accessed: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					namespace: undefined,
					lexeme:    'b',
					content:   'b',
					info:      {}
				},
				access: []
			})
		)
		assertAst(label('One Constant', ['name-normal', 'double-bracket-access']),
			shell, 'b[[5]]', exprList({
				type:     RType.Access,
				location: rangeFrom(1, 2, 1, 3),
				lexeme:   '[[',
				operator: '[[',
				info:     {},
				accessed: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					namespace: undefined,
					lexeme:    'b',
					content:   'b',
					info:      {}
				},
				access: [{
					type:     RType.Argument,
					location: rangeFrom(1, 4, 1, 4),
					lexeme:   '5',
					name:     undefined,
					info:     {},
					value:    {
						type:     RType.Number,
						location: rangeFrom(1, 4, 1, 4),
						lexeme:   '5',
						content:  numVal(5),
						info:     {}
					}
				}]
			})
		)
		assertAst(label('Multiple', ['name-normal', 'double-bracket-access', 'numbers']),
			shell, 'b[[5,3]]', exprList({
				type:     RType.Access,
				location: rangeFrom(1, 2, 1, 3),
				lexeme:   '[[',
				operator: '[[',
				info:     {},
				accessed: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					namespace: undefined,
					lexeme:    'b',
					content:   'b',
					info:      {}
				},
				access: [{
					type:     RType.Argument,
					location: rangeFrom(1, 4, 1, 4),
					lexeme:   '5',
					name:     undefined,
					info:     {},
					value:    {
						type:     RType.Number,
						location: rangeFrom(1, 4, 1, 4),
						lexeme:   '5',
						content:  numVal(5),
						info:     {}
					}
				}, {
					type:     RType.Argument,
					location: rangeFrom(1, 6, 1, 6),
					lexeme:   '3',
					name:     undefined,
					info:     {},
					value:    {
						type:     RType.Number,
						location: rangeFrom(1, 6, 1, 6),
						lexeme:   '3',
						content:  numVal(3),
						info:     {}
					}
				}]
			})
		)
		assertAst(label('Multiple with empty', ['name-normal', 'double-bracket-access', 'numbers', 'access-with-empty']),
			shell, 'b[[5,,]]', exprList({
				type:     RType.Access,
				location: rangeFrom(1, 2, 1, 3),
				lexeme:   '[[',
				operator: '[[',
				info:     {},
				accessed: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					namespace: undefined,
					lexeme:    'b',
					content:   'b',
					info:      {}
				},
				access: [{
					type:     RType.Argument,
					location: rangeFrom(1, 4, 1, 4),
					lexeme:   '5',
					name:     undefined,
					info:     {},
					value:    {
						type:     RType.Number,
						location: rangeFrom(1, 4, 1, 4),
						lexeme:   '5',
						content:  numVal(5),
						info:     {}
					}
				}, EmptyArgument, EmptyArgument]
			})
		)
	})
	describe('Dollar and Slot', () => {
		assertAst(label('Dollar access', ['name-normal', 'dollar-access']),
			shell, 'c$x', exprList({
				type:     RType.Access,
				location: rangeFrom(1, 2, 1, 2),
				lexeme:   '$',
				operator: '$',
				info:     {},
				accessed: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					namespace: undefined,
					lexeme:    'c',
					content:   'c',
					info:      {}
				},
				access: [{
					type:     RType.Argument,
					location: rangeFrom(1, 3, 1, 3),
					lexeme:   'x',
					name:     undefined,
					info:     {},
					value:    {
						type:      RType.Symbol,
						location:  rangeFrom(1, 3, 1, 3),
						namespace: undefined,
						lexeme:    'x',
						content:   'x',
						info:      {}
					}
				}]
			})
		)
		assertAst(label('Slot based access', ['name-normal', 'slot-access']),
			shell, 'd@y', exprList({
				type:     RType.Access,
				location: rangeFrom(1, 2, 1, 2),
				lexeme:   '@',
				operator: '@',
				info:     {},
				accessed: {
					type:      RType.Symbol,
					location:  rangeFrom(1, 1, 1, 1),
					namespace: undefined,
					lexeme:    'd',
					content:   'd',
					info:      {}
				},
				access: [{
					type:     RType.Argument,
					location: rangeFrom(1, 3, 1, 3),
					lexeme:   'y',
					name:     undefined,
					info:     {},
					value:    {
						type:      RType.Symbol,
						location:  rangeFrom(1, 3, 1, 3),
						namespace: undefined,
						lexeme:    'y',
						content:   'y',
						info:      {}
					}
				}]
			})
		)
	})
}))
