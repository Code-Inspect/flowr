import { testForFeatureForInput } from '../statistics.spec'
import { withShell } from '../../_helper/shell'
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
					location:           [1,1],
					callsites:          [],
					numberOfParameters: 1,
					returns:            [
						{ location: [1,6] }
					],
					length: {
						lines:                   1,
						characters:              6,
						nonWhitespaceCharacters: 5
					}
				}]]]
			]
		}
	])
}))
