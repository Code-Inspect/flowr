import { testForFeatureForInput } from '../statistics.spec'
import { withShell } from '../../_helper/shell'
import { emptyCommonSyntaxTypeCounts } from '../../../../src/statistics/features/common-syntax-probability'


describe('Used Function Calls', withShell(shell => {
	testForFeatureForInput(shell, 'usedFunctions', [
		{
			name:     'no calls',
			code:     'a <- 1',
			expected: {},
			written:  'nothing'
		},
		{
			name:     'one call',
			code:     'b()',
			expected: {
				allFunctionCalls: 1,
				args:             {
					0: 1n
				}
			},
			written: [
				['all-calls', [[[
					'b',
					[1, 1],
					0,
					'',
					0
				]]]],
			]
		},
		{
			name:     'one call with multiple arguments and namespace',
			code:     'a::b(3, 4)',
			expected: {
				allFunctionCalls: 1,
				args:             {
					1: {
						total:  1n,
						number: {
							'3': 1n
						}
					},
					2: {
						...emptyCommonSyntaxTypeCounts(),
						total:  1n,
						number: {
							'4': 1n
						}
					}
				}
			},
			written: [
				['all-calls', [[[
					'b',
					[1,1],
					2,
					'a',
					0
				]]]],
			]
		},
		{
			name:     'unnamed function call',
			code:     '(function(x) { x })(3)',
			expected: {
				allFunctionCalls: 1,
				unnamedCalls:     1,
				args:             {
					1: {
						total:  1n,
						number: {
							'3': 1n
						}
					}
				}
			},
			written: [
				['unnamed-calls', [
					['(function(x) { x })']
				]],
				['all-calls', [[[
					undefined,
					[1,1],
					1,
					'',
					1
				]]]],
			]
		},
		{
			name:     'calling a math function',
			code:     'sin(3)',
			expected: {
				allFunctionCalls: 1,
				args:             {
					1: {
						total:  1n,
						number: {
							'3': 1n
						}
					}
				}
			},
			written: [
				['all-calls', [[[
					'sin',
					[1,1],
					1,
					'',
					0
				]]]],
			]
		},
		{
			name: 'nested function calls',
			code: `a(b(), c(3, d()))
				if(a(b(), d(e))) {
					f()
				}
			`,
			expected: {
				allFunctionCalls:    8,
				nestedFunctionCalls: 5,
				deepestNesting:      2,
				args:                {
					0: 4n,
					1: {
						total:  4n,
						number: {
							'3': 1n
						},
						singleVar: {
							'e': 1n
						},
						call: {
							'b': 2n
						}
					},
					2: {
						...emptyCommonSyntaxTypeCounts(),
						total: 3n,
						call:  {
							'c': 1n,
							'd': 2n
						}
					}
				}
			},
			written: [
				['nested-calls', [
					['b'],
					['c'],
					['d'],
					['b'],
					['d']
				]],
				['all-calls', [
					[[
						'a',
						[1, 1],
						2,
						'',
						0
					]],
					[[
						'b',
						[1,3],
						0,
						'',
						0
					]],
					[[
						'c',
						[1,8],
						2,
						'',
						0
					]],
					[[
						'd',
						[1,13],
						0,
						'',
						0
					]],
					[[
						'a',
						[2, 36],
						2,
						'',
						0
					]],
					[[
						'b',
						[2,38],
						0,
						'',
						0
					]],
					[[
						'd',
						[2,43],
						1,
						'',
						0
					]],
					[[
						'f',
						[3,41],
						0,
						'',
						0
					]]
				]]]
		}
	])
}))
