import { withShell } from '../../_helper/shell'
import { testForFeatureForInput } from '../statistics.spec'
import { RFalse, RTrue } from '../../../../src/r-bridge'


describe('Controlflow', withShell(shell => {
	testForFeatureForInput(shell, 'controlflow', [
		{
			name:     'no control flow',
			code:     'a <- 1',
			expected: {},
			written:  'nothing'
		},
		{
			name:     'if-then with constant condition',
			code:     'if(TRUE) { x }',
			expected: {
				ifThen: {
					total:   1n,
					logical: {
						[RTrue]: 1n
					}
				},
				thenBody: {
					total:     1n,
					singleVar: {
						x: 1n
					}
				}
			},
			written: 'nothing'
		},
		{
			name:     'if-then-else with constant condition',
			code:     'if(FALSE) { x } else { y }',
			expected: {
				ifThenElse: {
					total:   1n,
					logical: {
						[RFalse]: 1n,
					}
				},
				thenBody: {
					total:     1n,
					singleVar: {
						x: 1n
					}
				},
				elseBody: {
					total:     1n,
					singleVar: {
						y: 1n
					}
				}
			},
			written: 'nothing'
		},
		{
			name:     'if-then with single variable',
			code:     'if(c) { x }',
			expected: {
				ifThen: {
					total: 		  1n,
					singleVar: {
						c: 1n
					}
				},
				thenBody: {
					total:     1n,
					singleVar: {
						x: 1n
					}
				}
			},
			written: 'nothing'
		},
		{
			name:     'if-then-else with single variable',
			code:     'if(c) { x } else { y }',
			expected: {
				ifThenElse: {
					total: 		  1n,
					singleVar: {
						c: 1n
					}
				},
				thenBody: {
					total:     1n,
					singleVar: {
						x: 1n
					}
				},
				elseBody: {
					total:     1n,
					singleVar: {
						y: 1n
					}
				}
			},
			written: 'nothing'
		},
		{
			name:     'if-then with simple condition',
			code:     'if(c == 1) { x }',
			expected: {
				ifThen: {
					total: 1n,
					binOp: {
						'==': 1n
					}
				},
				thenBody: {
					total:     1n,
					singleVar: {
						x: 1n
					}
				}
			},
			written: 'nothing'
		},
		{
			name:     'if-then-else with simple condition',
			code:     'if(c == "alpha") { x } else { y }',
			expected: {
				ifThenElse: {
					total: 1n,
					binOp: {
						'==': 1n
					}
				},
				thenBody: {
					total:     1n,
					singleVar: {
						x: 1n
					}
				},
				elseBody: {
					total:     1n,
					singleVar: {
						y: 1n
					}
				}
			},
			written: 'nothing'
		},
		{
			name:     'remain constant with call',
			code:     'if (!require("XX")) install.packages("XX")',
			expected: {
				ifThen: {
					total:   1n,
					unaryOp: {
						'!': 1n
					}
				},
				thenBody: {
					total: 1n,
					call:  {
						'install.packages': 1n
					}
				}
			},
			written: 'nothing'
		},
		{
			name:     'switch with constant condition',
			code:     'switch(1, x)',
			expected: {
				switchCase: {
					total:  1n,
					number: {
						1: 1n
					}
				}
			},
			written: 'nothing'
		},
		{
			name:     'switch with single variable condition',
			code:     'switch(x, y, z)',
			expected: {
				switchCase: {
					total:     1n,
					singleVar: {
						x: 1n
					}
				}
			},
			written: 'nothing'
		}
	])
}))

