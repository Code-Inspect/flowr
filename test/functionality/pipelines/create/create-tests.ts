import { createPipeline } from '../../../../src/core/steps/pipeline'
import type { IPipelineStep, PipelineStepName } from '../../../../src/core/steps/step'
import { expect } from 'chai'
import { PARSE_WITH_R_SHELL_STEP } from '../../../../src/core/steps/all/core/00-parse'
import { allPermutations } from '../../../../src/util/arrays'
import { NORMALIZE } from '../../../../src/core/steps/all/core/10-normalize'
import { STATIC_DATAFLOW } from '../../../../src/core/steps/all/core/20-dataflow'
import { STATIC_SLICE } from '../../../../src/core/steps/all/static-slicing/00-slice'
import { NAIVE_RECONSTRUCT } from '../../../../src/core/steps/all/static-slicing/10-reconstruct'

describe('Create Pipeline (includes dependency checks)', () => {
	describe('error-cases', () => {
		function negative(name: string, rawSteps: IPipelineStep[], message: string | RegExp) {
			it(`${name} (all permutations)`, () => {
				for(const steps of allPermutations(rawSteps)) {
					expect(() => createPipeline(...steps)).to.throw(message)
				}
			})
		}
		describe('without decorators', () => {
			negative('should throw on empty input', [], /empty/)
			negative('should throw on duplicate names',
				[PARSE_WITH_R_SHELL_STEP, PARSE_WITH_R_SHELL_STEP], /duplicate|not unique/)
			negative('should throw on invalid dependencies',
				[PARSE_WITH_R_SHELL_STEP, {
					...PARSE_WITH_R_SHELL_STEP,
					name:         'parse-v2',
					dependencies: ['foo']
				}], /invalid dependency|not exist/)
			negative('should throw on cycles',
				[PARSE_WITH_R_SHELL_STEP,
					{
						...PARSE_WITH_R_SHELL_STEP,
						name:         'parse-v1',
						dependencies: ['parse-v2']
					},
					{
						...PARSE_WITH_R_SHELL_STEP,
						name:         'parse-v2',
						dependencies: ['parse-v1']
					}
				], /cycle/)
		})
		describe('with decorators', () => {
			negative('should throw on decoration cycles',
				[PARSE_WITH_R_SHELL_STEP,
					{
						...PARSE_WITH_R_SHELL_STEP,
						name:         'parse-v1',
						decorates:    'parse',
						dependencies: ['parse-v2']
					},
					{
						...PARSE_WITH_R_SHELL_STEP,
						name:         'parse-v2',
						decorates:    'parse',
						dependencies: ['parse-v1']
					}
				], /decoration cycle/)
			negative('decorate non-existing step',
				[{
					...PARSE_WITH_R_SHELL_STEP,
					decorates: 'foo'
				}], /decorates.+not exist/)
		})
	})
	describe('default behavior', () => {
		function positive(name: string, rawSteps: IPipelineStep[], expected: PipelineStepName[], indexOfFirstPerFile: number = expected.length) {
			it(`${name} (all permutations)`, () => {
				for(const steps of allPermutations(rawSteps)) {
					const pipeline = createPipeline(...steps)
					expect([...pipeline.steps.keys()]).to.have.members(expected, `should have the correct keys for ${JSON.stringify(steps)}`)
					expect(pipeline.order).to.have.ordered.members(expected, `should have the correct keys for ${JSON.stringify(steps)}`)
					expect(pipeline.firstStepPerRequest).to.equal(indexOfFirstPerFile, `should have the correct firstStepPerRequest for ${JSON.stringify(steps)}`)
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
				STATIC_DATAFLOW,
				STATIC_SLICE,
				NAIVE_RECONSTRUCT
			], ['parse', 'normalize', 'dataflow', 'slice', 'reconstruct'], 3)
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
			], ['parse', 'parse-v2'], 2)
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
			positive('not the first, and multiple decorators', [
				PARSE_WITH_R_SHELL_STEP,
				{
					...PARSE_WITH_R_SHELL_STEP,
					name:         'parse-v2',
					dependencies: ['parse'],
				},
				{
					...PARSE_WITH_R_SHELL_STEP,
					name:      'parse-v3',
					decorates: 'parse-v2',
				},
				{
					...PARSE_WITH_R_SHELL_STEP,
					name:         'parse-v4',
					dependencies: ['parse-v2']
				},
				{
					...PARSE_WITH_R_SHELL_STEP,
					name:         'parse-v6',
					dependencies: ['parse-v4']
				},
				{
					...PARSE_WITH_R_SHELL_STEP,
					name:      'parse-v5',
					decorates: 'parse-v6',
				}
			], ['parse', 'parse-v2', 'parse-v3', 'parse-v4', 'parse-v6', 'parse-v5'])
			positive('default pipeline with dataflow decoration', [
				PARSE_WITH_R_SHELL_STEP,
				NORMALIZE,
				STATIC_DATAFLOW,
				{
					...STATIC_DATAFLOW,
					name:      'dataflow-decorator',
					decorates: 'dataflow'
				},
				STATIC_SLICE,
				NAIVE_RECONSTRUCT
			], ['parse', 'normalize', 'dataflow', 'dataflow-decorator',  'slice', 'reconstruct'], 4)
		})
	})
})
