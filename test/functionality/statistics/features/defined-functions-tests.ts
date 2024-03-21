import { withShell } from '../../_helper/shell'
import { testForFeatureForInput } from '../statistics.spec'
import { MIN_VERSION_LAMBDA } from '../../../../src/r-bridge/lang-4.x/ast/model/versions'


describe('Defined Functions', withShell(shell => {
	testForFeatureForInput(shell, 'definedFunctions', [
		{
			name:     'no definitions',
			code:     'a <- 1',
			expected: {},
			written:  'nothing'
		},
		{
			name:     'the identity function',
			code:     'function(x) { x }',
			expected: {
				total: 1
			},
			written: [
				['usedParameterNames', [['x']]],
				['all-definitions', [ [{
					location:           { line: 1, column: 1 },
					callsites:          [],
					numberOfParameters: 1,
					returns:            [
						{ explicit: false, location: { line: 1, column: 15 } }
					],
					length: {
						lines:                   1,
						characters:              17,
						nonWhitespaceCharacters: 14
					}
				}]]]
			]
		},
		{
			name:         'the identity lambda function',
			code:         '\\(x) x',
			requirements: {
				minRVersion: MIN_VERSION_LAMBDA
			},
			expected: {
				total:       1,
				lambdasOnly: 1
			},
			written: [
				['usedParameterNames', [['x']]],
				['allLambdas', [['\\(x) x']]],
				['all-definitions', [ [{
					location:           { line: 1, column: 1 },
					callsites:          [],
					numberOfParameters: 1,
					returns:            [
						{ explicit: false, location: { line: 1, column: 6 } }
					],
					length: {
						lines:                   1,
						characters:              6,
						nonWhitespaceCharacters: 5
					}
				}]]]
			]
		},
		{
			name:     'nested function definition',
			code:     'function(x) { function(y) { x + y } }',
			expected: {
				total:           2,
				nestedFunctions: 1,
				deepestNesting:  1
			},
			written: [
				['usedParameterNames', [['x'], ['y']]],
				['nested-definitions', [['function(y) { x + y }']]],
				['all-definitions', [ [{
					location:           { line: 1, column: 1 },
					callsites:          [],
					numberOfParameters: 1,
					returns:            [
						{ explicit: false, location: { line: 1, column: 15 } }
					],
					length: {
						lines:                   1,
						characters:              37,
						nonWhitespaceCharacters: 29
					}
				}], [{
					location:           { line: 1, column: 15 },
					callsites:          [],
					numberOfParameters: 1,
					returns:            [
						{ explicit: false, location: { line: 1, column: 31 } }
					],
					length: {
						lines:                   1,
						characters:              21,
						nonWhitespaceCharacters: 16
					}
				}]]]
			]
		},
		{
			name: 'the fibonacci function (named and recursive)',
			code: `fib <- function(n) { 
				if(n < 2) { 
					return(n) 
				} else { 
					return(fib(n - 1) + fib(n - 2)) 
				}
			}`,
			expected: {
				total:             1,
				recursive:         1,
				assignedFunctions: 1
			},
			written: [
				['usedParameterNames', [['n']]],
				['assignedFunctions', [['fib']]],
				['recursive', [['fib(n - 1)'], ['fib(n - 2)']]],
				['all-definitions', [ [{
					location:  { line: 1, column: 8 },
					callsites: [
						{ line: 5, column: 48 },
						{ line: 5, column: 61 }
					],
					numberOfParameters: 1,
					returns:            [
						{ explicit: true, location: { line: 3, column: 41 } },
						{ explicit: true, location: { line: 5, column: 41 } }
					],
					length: {
						lines:                   7,
						characters:              110,
						nonWhitespaceCharacters: 62
					}
				}]]]
			]
		}
	])
}))

