import { retrieveNormalizedAst, withShell } from '../../../_helper/shell'
import { assert } from 'chai'
import { requestFromInput } from '../../../../../src/r-bridge'
import { SteppingSlicer } from '../../../../../src/core'

describe('Check hooks are called appropriately', withShell(shell => {
	it('Call the number hook!', async() => {
		let before = false
		let after = false
		await retrieveNormalizedAst(shell, '1', {
			values: {
				onNumber: {
					before: () => {
						before = true; return undefined 
					},
					after: () => {
						after = true; return undefined 
					}
				},
			},
		})
		assert.isTrue(before, 'The number before-hook was not called!')
		assert.isTrue(after, 'The number after-hook was not called!')
	})
	it('Call the string hook!', async() => {
		let counter = 0

		await new SteppingSlicer({
			stepOfInterest: 'normalize',
			shell,
			request:        requestFromInput('x <- "foo"'),
			hooks:          {
				values: {
					onString: {
						after: () => {
							counter++ 
						},
					}
				}
			}
		}).allRemainingSteps()

		assert.equal(counter, 1, 'The string after-hook should be called once')
	})
}))
