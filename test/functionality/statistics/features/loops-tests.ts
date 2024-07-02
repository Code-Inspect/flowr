import { testForFeatureForInput } from '../statistics.spec'
import { withShell } from '../../_helper/shell'
import { RFalse, RTrue } from '../../../../src/r-bridge/lang-4.x/convert-values'


describe('Loops', withShell(shell => {
	testForFeatureForInput(shell, 'loops', [
		{
			name:     'no control loops',
			code:     'a <- 1; 4 * x; foo(a) # while(FALSE) {} ',
			expected: {},
			written:  'nothing'
		},
		{
			name:     'one while loop, with a break',
			code:     'while(TRUE) { print(3); break }',
			expected: {
				whileLoops: {
					total:   1n,
					logical: {
						[RTrue]: 1n
					}
				},
				whileBody: {
					total:    1n,
					multiple: 1n
				},
				breakStatements: 1
			},
			// records only implicit and nested loops
			written: [
				['all-loops', [['while(TRUE) { print(3); break }']]],
			]
		},
		{
			name:     'one for loop, with a next',
			code:     'for(i in 1:10) { print(9); next }',
			expected: {
				forLoops: {
					total: 1n,
					binOp: {
						':': 1n
					}
				},
				forBody: {
					total:    1n,
					multiple: 1n
				},
				forLoopVar: {
					total:     1n,
					singleVar: {
						'i': 1n
					}
				},
				nextStatements: 1
			},
			written: [
				['all-loops', [['for(i in 1:10) { print(9); next }']]],
			]
		},
		{
			name:     'one repeat loop, with multiple breaks, and nexts',
			code:     'repeat { print(9); if(runif(3) > 0.5) { break } else { if(runif(3) > 0.5) next else break }; next }',
			expected: {
				repeatLoops: 1n,
				repeatBody:  {
					total:    1n,
					multiple: 1n
				},
				breakStatements: 2,
				nextStatements:  2
			},
			written: [
				['all-loops', [['repeat { print(9); if(runif(3) > 0.5) { break } else { if(runif(3) > 0.5) next else break }; next }']]],
			]
		},
		{
			name:     'simply nested while loops',
			code:     'while(TRUE) { while(FALSE) { print(3) } }',
			expected: {
				whileLoops: {
					total:   2n,
					logical: {
						[RTrue]:  1n,
						[RFalse]: 1n
					}
				},
				whileBody: {
					total: 2n,
					other: {
						'while': 1n
					},
					call: {
						print: 1n
					}
				},
				nestedExplicitLoops:    1,
				deepestExplicitNesting: 1
			},
			written: [
				['all-loops', [
					['while(TRUE) { while(FALSE) { print(3) } }'],
					['while(FALSE) { print(3) }']
				]],
			]
		},
		{
			name: 'using implicit loops',
			code: `
			apply(x, 2, f)
			lapply(x, f)
			sapply(x, f)
			vapply(x, f)
			tapply(x, f)
			mapply(x, f)
			`,
			expected: {
				implicitLoops: 6
			},
			written: [
				['implicit-loop', [['apply(x, 2, f)'], ['lapply(x, f)'], ['sapply(x, f)'], ['vapply(x, f)'], ['tapply(x, f)'], ['mapply(x, f)']]],
			]
		},
		{
			name: 'many nested loops',
			code: `
while(TRUE) {
	while(FALSE) {
		for(i in 1:10) {
			repeat { }
		}
	}
	for(j in 1:10) { while(x) { } }
	repeat { while(FALSE) {} }
}
for(k in x:3) { repeat { } }
			`,
			expected: {
				whileLoops: {
					total:   4n,
					logical: {
						[RTrue]:  1n,
						[RFalse]: 2n
					},
					singleVar: {
						'x': 1n
					}
				},
				whileBody: {
					total:    4n,
					multiple: 1n,
					empty:    2n,
					other:    {
						'for': 1n
					},
				},
				forLoops: {
					total: 3n,
					binOp: {
						':': 3n
					}
				},
				forBody: {
					total: 3n,
					other: {
						'repeat': 2n,
						'while':  1n
					}
				},
				forLoopVar: {
					total:     3n,
					singleVar: {
						'i': 1n,
						'j': 1n,
						'k': 1n
					}
				},
				repeatLoops: 3n,
				repeatBody:  {
					total: 3n,
					empty: 2n,
					other: {
						'while': 1n
					}
				},
				nestedExplicitLoops:    8,
				deepestExplicitNesting: 3
			},
			written: [
				['all-loops', [
					['while(TRUE) {\n\twhile(FALSE) {\n\t\tfor(i in 1:10) {\n\t\t\trepeat { }\n\t\t}\n\t}\n\tfor(j in 1:10) { while(x) { } }\n\trepeat { while(FALSE) {} }\n}' ],
					['while(FALSE) {\n\t\tfor(i in 1:10) {\n\t\t\trepeat { }\n\t\t}\n\t}' ],
					['for(i in 1:10) {\n\t\t\trepeat { }\n\t\t}' ],
					['repeat { }' ],
					['for(j in 1:10) { while(x) { } }' ],
					['while(x) { }' ],
					['repeat { while(FALSE) {} }'],
					['while(FALSE) {}' ],
					['for(k in x:3) { repeat { } }' ],
					['repeat { }' ]
				]]
			]
		}
	])
}))
