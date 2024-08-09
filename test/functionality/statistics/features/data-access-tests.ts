import { testForFeatureForInput } from '../statistics.spec'
import { withShell } from '../../_helper/shell'
import { emptyCommonSyntaxTypeCounts } from '../../../../src/statistics/features/common-syntax-probability'

describe('Data Access', withShell(shell => {
	testForFeatureForInput(shell, 'dataAccess', [
		{
			name:     'no data access',
			code:     'a <- 1; 4 * x; foo(a) # a[3]',
			expected: {},
			written:  'nothing'
		},
		{
			name:     'single bracket access, including empty',
			code:     'a[1]; a[]',
			expected: {
				singleBracket: {
					0: 1n,
					1: {
						total:  1n,
						number: {
							1: 1n,
						}
					}
				}
			},
			written: [
				['dataAccess', [['a[1]'], ['a[]']]],
			]
		},
		{
			name:     'double bracket access, including empty',
			code:     'a[[1]]; a[[]]',
			expected: {
				doubleBracket: {
					0: 1n,
					1: {
						total:  1n,
						number: {
							1: 1n,
						}
					}
				}
			},
			written: [
				['dataAccess', [['a[[1]]'], ['a[[]]']]],
			]
		},
		{
			name:     'using an expression',
			code:     'a[[x + y]]; a[x - 3]',
			expected: {
				doubleBracket: {
					1: {
						total: 1n,
						binOp: {
							'+': 1n
						}
					}
				},
				singleBracket: {
					1: {
						total: 1n,
						binOp: {
							'-': 1n
						}
					}
				}
			},
			written: [
				['dataAccess', [['a[[x + y]]'], ['a[x - 3]']]],
			]
		},
		{
			name:     'using only a single variable',
			code:     'a[x]; a[[x]]',
			expected: {
				doubleBracket: {
					1: {
						total:     1n,
						singleVar: {
							x: 1n
						}
					}
				},
				singleBracket: {
					1: {
						total:     1n,
						singleVar: {
							x: 1n
						}
					}
				}
			},
			written: [
				['dataAccess', [['a[x]'], ['a[[x]]']]],
			]
		},
		{
			name:     'named and slotted access',
			code:     'a$hello; a$"world"; a@hello; a@"world"',
			expected: {
				byName: 2,
				bySlot: 2
			},
			written: [
				['dataAccess', [['a$hello'], ['a$"world"'], ['a@hello'], ['a@"world"']]],
			]
		},
		{
			name:     'nested double bracket access',
			code:     'a[[1]][[2]]',
			expected: {
				doubleBracket: {
					1: {
						total:  2n,
						number: {
							1: 1n,
							2: 1n
						}
					}
				},
				chainedOrNestedAccess: 1,
				longestChain:          1
			},
			written: [
				['dataAccess', [['a[[1]][[2]]']]],
			]
		},
		{
			name:     'comma access',
			code:     'a[1,x,3]; b[[2,name=3]]',
			expected: {
				singleBracket: {
					1: {
						total:  1n,
						number: {
							1: 1n
						}
					},
					2: {
						...emptyCommonSyntaxTypeCounts(),
						total:     1n,
						singleVar: {
							x: 1n
						}
					},
					3: {
						...emptyCommonSyntaxTypeCounts(),
						total:  1n,
						number: {
							3: 1n
						}
					}
				},
				doubleBracket: {
					1: {
						total:  1n,
						number: {
							2: 1n
						}
					},
					2: {
						...emptyCommonSyntaxTypeCounts(),
						total:        1n,
						withArgument: 1n,
						number:       {
							3: 1n
						}
					}
				}
			},
			written: [
				['dataAccess', [['a[1,x,3]'], ['b[[2,name=3]]']]],
			]
		},
		{
			name:     'deeply nested mixed access',
			code:     'a[[1]][2]$x[y]@z',
			expected: {
				doubleBracket: {
					1: {
						total:  1n,
						number: {
							1: 1n
						}
					}
				},
				singleBracket: {
					1: {
						total:  2n,
						number: {
							2: 1n
						},
						singleVar: {
							y: 1n
						}
					}
				},
				byName:                1,
				bySlot:                1,
				chainedOrNestedAccess: 4,
				longestChain:          4
			},
			written: [
				['dataAccess', [['a[[1]][2]$x[y]@z']]],
			]
		},
		{
			name:     'nested in the argument',
			code:     'a[[ x[ y[3] ] ]]',
			expected: {
				doubleBracket: {
					1: {
						total: 1n,
						other: {
							'[': 1n
						}
					}
				},
				singleBracket: {
					1: {
						total: 2n,
						other: {
							'[': 1n,
						},
						number: {
							3: 1n
						}
					}
				},
				chainedOrNestedAccess: 2,
				deepestNesting:        2
			},
			written: [
				['dataAccess', [['a[[ x[ y[3] ] ]]']]],
			]
		},
		{
			name:     'nested in the argument and expressions',
			code:     'a[[ if (x[ y[3] > 25 ]) 0 else 2 ]]',
			expected: {
				doubleBracket: {
					1: {
						total: 1n,
						other: {
							'if': 1n
						}
					}
				},
				singleBracket: {
					1: {
						total: 2n,
						binOp: {
							'>': 1n,
						},
						number: {
							3: 1n
						}
					}
				},
				chainedOrNestedAccess: 2,
				deepestNesting:        2
			},
			written: [
				['dataAccess', [['a[[ if (x[ y[3] > 25 ]) 0 else 2 ]]']]],
			]
		},
		{
			name:     'nested and chained',
			code:     'a[[ x[ y[3]$b ] ]]$c$d$e',
			expected: {
				doubleBracket: {
					1: {
						total: 1n,
						other: {
							'[': 1n
						}
					}
				},
				singleBracket: {
					1: {
						total: 2n,
						other: {
							'$': 1n,
						},
						number: {
							3: 1n
						}
					}
				},
				chainedOrNestedAccess: 6,
				deepestNesting:        2,
				longestChain:          4,
				byName:                4
			},
			written: [
				['dataAccess', [['a[[ x[ y[3]$b ] ]]$c$d$e']]],
			]
		},
		{
			name:     'nested named and slotted access',
			code:     'a$hello$"world"; a@hello@"world"',
			expected: {
				byName:                2,
				bySlot:                2,
				chainedOrNestedAccess: 2,
				longestChain:          1
			},
			written: [
				['dataAccess', [['a$hello$"world"'], ['a@hello@"world"']]],
			]
		}
	])
}))
