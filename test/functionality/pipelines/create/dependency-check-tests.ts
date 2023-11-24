import { createPipeline } from '../../../../src/core/steps/pipeline'
import { IStep, NameOfStep } from '../../../../src/core/steps'
import { expect } from 'chai'
import { PARSE_WITH_R_SHELL_STEP } from '../../../../src/core/steps/all/00-parse'
import { allPermutations } from '../../../../src/util/arrays'
import { NORMALIZE } from '../../../../src/core/steps/all/10-normalize'
import { LEGACY_STATIC_DATAFLOW } from '../../../../src/core/steps/all/20-dataflow'
import { STATIC_SLICE } from '../../../../src/core/steps/all/30-slice'
import { NAIVE_RECONSTRUCT } from '../../../../src/core/steps/all/40-reconstruct'

describe('dependency check', () => {
	describe('error-cases', () => {
		function negative(name: string, steps: IStep[], message: string | RegExp) {
			it(name, () => {
				expect(() => createPipeline(steps)).to.throw(message)
			})
		}
		negative('should throw on empty input', [], /empty/)
		negative('should throw on duplicate names',
			[PARSE_WITH_R_SHELL_STEP, PARSE_WITH_R_SHELL_STEP], /duplicate|not unique/)
		negative('should throw on invalid dependencies',
			[PARSE_WITH_R_SHELL_STEP, { ...PARSE_WITH_R_SHELL_STEP, name: 'parse-v2', dependencies: ['foo'] }], /invalid dependency|not exist/)
		negative('should throw on cycles',
			[PARSE_WITH_R_SHELL_STEP,
				{ ...PARSE_WITH_R_SHELL_STEP, name: 'parse-v1', dependencies: ['parse-v2'] },
				{ ...PARSE_WITH_R_SHELL_STEP, name: 'parse-v2', dependencies: ['parse-v1'] }
			], /cycle/)
	})
	describe('default behavior', () => {
		function positive(name: string, rawSteps: IStep[], expected: NameOfStep[]) {
			it(name, () => {
				// try all permutations
				for(const steps of allPermutations(rawSteps)) {
					const pipeline = createPipeline(steps)
					expect([...pipeline.steps.keys()]).to.have.members(expected, `should have the correct keys for ${JSON.stringify(steps)}`)
					expect(pipeline.order).to.have.ordered.members(expected, `should have the correct keys for ${JSON.stringify(steps)}`)
				}
			})
		}

		describe('without decorators', () => {
			positive('should work on a single step', [PARSE_WITH_R_SHELL_STEP], ['parse'])
			positive('should work on a single step with dependencies', [
				PARSE_WITH_R_SHELL_STEP,
				{
					...PARSE_WITH_R_SHELL_STEP,
					name:         'parse-v2',
					dependencies: ['parse']
				}
			], ['parse', 'parse-v2'])
			// they will be shuffled in all permutations
			positive('default pipeline', [
				PARSE_WITH_R_SHELL_STEP,
				NORMALIZE,
				LEGACY_STATIC_DATAFLOW,
				STATIC_SLICE,
				NAIVE_RECONSTRUCT
			], ['parse', 'normalize', 'dataflow', 'slice', 'reconstruct'])
		})
		describe('with decorators', () => {
			positive('simple decorator on first step', [
				PARSE_WITH_R_SHELL_STEP,
				{
					...PARSE_WITH_R_SHELL_STEP,
					name:         'parse-v2',
					dependencies: [],
					decorates:    'parse',
				}
			], ['parse', 'parse-v2'])
			positive('decorators can depend on each other', [
				PARSE_WITH_R_SHELL_STEP,
				{
					...PARSE_WITH_R_SHELL_STEP,
					name:      'parse-v2',
					decorates: 'parse',
				},
				{
					...PARSE_WITH_R_SHELL_STEP,
					name:         'parse-v3',
					dependencies: ['parse-v2'],
					decorates:    'parse',
				}
			], ['parse', 'parse-v2', 'parse-v3'])
		})
	})
})
