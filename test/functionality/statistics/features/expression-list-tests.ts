import { withShell } from '../../_helper/shell'
import { testForFeatureForInput } from '../statistics.spec'


describe('Expression List', withShell(shell => {
	testForFeatureForInput(shell, 'expressionList', [
		{
			name:     'just the root expression list',
			code:     'a <- 1; 4 * x; foo(a) # while(FALSE) {} ',
			expected: {
				allExpressionLists: 1
			},
			written: 'nothing'
		},
		{
			name: 'a lot of nesting',
			code: `
			if(TRUE) {
				if(FALSE) {
				   repeat {
				   		x <- 3;
				   }
				}
			} else { }
			for(i in 1:10) {
				if(i %% 2 == 0) {
					x <- 3
				}
			}
			`,
			expected: {
				allExpressionLists: 7,
				deepestNesting:     3
			},
			written: 'nothing'
		}
	])
}))

