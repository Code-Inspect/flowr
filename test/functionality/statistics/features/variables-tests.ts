import { withShell } from '../../_helper/shell'
import { testForFeatureForInput } from '../statistics.spec'


describe('Variables', withShell(shell => {
	testForFeatureForInput(shell, 'variables', [
		{
			name:     'no variables',
			code:     '2 + 3',
			expected: {},
			written:  'nothing'
		},
		{
			name:     'one variable use',
			code:     'a',
			expected: {
				numberOfVariableUses: 1
			},
			written: [['usedVariables', [[[
				'a',
				[1,1]
			]]]]]
		},
		{
			name:     'one variable definition',
			code:     'a <- 3',
			expected: {
				numberOfDefinitions: 1
			},
			written: [
				['definedVariables', [[[
					'a',
					[1,1]
				]]]],
			]
		},
		{
			name:     'one variable use and re-definitions',
			code:     'abc <- 3\nabc <- abc + 3\nabc <- x',
			expected: {
				numberOfDefinitions:   3,
				numberOfRedefinitions: 2,
				numberOfVariableUses:  2
			},
			written: [
				['definedVariables', [[[
					'abc',
					[1,1]
				]], [[
					'abc',
					[2,1]
				]], [[
					'abc',
					[3,1]
				]]]],
				['redefinedVariables', [[[
					'abc',
					[1,1]
				]], [[
					'abc',
					[2,1]
				]]]],
				['usedVariables', [[[
					'abc',
					[2,8]
				]], [[
					'x',
					[3,8]
				]]]]
			]
		}
	])
}))
