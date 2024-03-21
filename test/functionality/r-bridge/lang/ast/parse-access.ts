import { assertAst, withShell } from '../../../_helper/shell'
import { exprList, numVal } from '../../../_helper/ast-builder'
import { rangeFrom } from '../../../../../src/util/range'
import { RType } from '../../../../../src/r-bridge'

describe('Parse value access', withShell(shell => {
	describe('Single bracket', () => {
		assertAst('Empty', shell, 'a[]', exprList({
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
		}))
		assertAst('One value', shell, 'a[1]', exprList({
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
		}))
		assertAst('One variable', shell, 'a[x]', exprList({
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
		}))
		assertAst('One expression', shell, 'a[x + 3]', exprList({
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
					flavor:   'arithmetic',
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
		}))
		assertAst('Multiple', shell, 'a[3,2]', exprList({
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
		}))
		assertAst('Multiple with empty', shell, 'a[,2,4]', exprList({
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
			access: [null, {
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
		assertAst('Named argument', shell, 'a[1,super=4]', exprList({
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
		}))
		assertAst('Chained', shell, 'a[1][4]', exprList({
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
		}))
	})
	describe('Double bracket', () => {
		assertAst('Empty', shell, 'b[[]]', exprList({
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
		}))
		assertAst('One element', shell, 'b[[5]]', exprList({
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
		}))
		assertAst('Multiple', shell, 'b[[5,3]]', exprList({
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
		}))
		assertAst('Multiple with empty', shell, 'b[[5,,]]', exprList({
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
			},null,null]
		}))
	})
	describe('Dollar and Slot', () => {
		assertAst('Dollar access', shell, 'c$x', exprList({
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
			access: 'x'
		}))
		assertAst('Slot based access', shell, 'd@y', exprList({
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
			access: 'y'
		}))
	})
}))

