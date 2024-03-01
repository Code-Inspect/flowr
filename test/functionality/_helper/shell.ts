import { it } from 'mocha'
import { testRequiresNetworkConnection } from './network'
import type { DeepPartial } from 'ts-essentials'
import type {
	DecoratedAstMap,
	IdGenerator,
	NodeId,
	NoInfo,
	RExpressionList,
	RNode,
	RNodeWithParent,
	XmlParserHooks
} from '../../../src'
import {
	deterministicCountingIdGenerator, requestFromInput,
	RShell
} from '../../../src'
import { assert } from 'chai'
import type { SlicingCriteria } from '../../../src'
import { testRequiresRVersion } from './version'
import type { MergeableRecord } from '../../../src/util/objects'
import { deepMergeObject } from '../../../src/util/objects'
import { NAIVE_RECONSTRUCT } from '../../../src/core/steps/all/static-slicing/10-reconstruct'
import type { DifferenceReport } from '../../../src/util/diff'
import { guard } from '../../../src/util/assert'
import { createPipeline } from '../../../src/core/steps/pipeline'
import { PipelineExecutor } from '../../../src/core/pipeline-executor'
import { PARSE_WITH_R_SHELL_STEP } from '../../../src/core/steps/all/core/00-parse'
import { NORMALIZE } from '../../../src/core/steps/all/core/10-normalize'
import { DESUGAR_NORMALIZE } from '../../../src/core/steps/all/core/10-normalize'
import type { DataflowGraph } from '../../../src/dataflow/v1'
import { diffGraphsToMermaidUrl, graphToMermaidUrl } from '../../../src/dataflow/v1'
import { SteppingSlicer } from '../../../src/core/stepping-slicer'
import { LAST_STEP } from '../../../src/core/steps/steps'
import type { TestLabel } from './label'
import { decorateLabelContext } from './label'
import { V2_STATIC_DATAFLOW } from '../../../src/core/steps/all/core/20-dataflow'
import { LEGACY_STATIC_DATAFLOW } from '../../../src/core/steps/all/core/20-dataflow'

export const testWithShell = (msg: string, fn: (shell: RShell, test: Mocha.Context) => void | Promise<void>): Mocha.Test => {
	return it(msg, async function(): Promise<void> {
		let shell: RShell | null = null
		try {
			shell = new RShell()
			await fn(shell, this)
		} finally {
			// ensure we close the shell in error cases too
			shell?.close()
		}
	})
}

/**
 * produces a shell session for you, can be used within a `describe` block
 * @param fn       - function to use the shell
 */
export function withShell(fn: (shell: RShell) => void): () => void {
	return function() {
		after(() => shell.close())
		const shell = new RShell()
		fn(shell)
	}
}

function removeInformation<T extends Record<string, unknown>>(obj: T, includeTokens: boolean): T {
	return JSON.parse(JSON.stringify(obj, (key, value) => {
		if(key === 'fullRange' || key === 'fullLexeme' || key === 'id' || key === 'parent' || key === 'index' || key === 'role') {
			return undefined
		} else if(key === 'additionalTokens' && (!includeTokens || (Array.isArray(value) && value.length === 0))) {
			return undefined
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return value
	})) as T
}


function assertAstEqualIgnoreSourceInformation<Info>(ast: RNode<Info>, expected: RNode<Info>, includeTokens: boolean, message?: () => string): void {
	const astCopy = removeInformation(ast, includeTokens)
	const expectedCopy = removeInformation(expected, includeTokens)
	try {
		assert.deepStrictEqual(astCopy, expectedCopy)
	} catch(e) {
		if(message) {
			console.error(message())
		}
		throw e
	}
}

export const retrieveNormalizedAst = async(shell: RShell, input: `file://${string}` | string, hooks?: DeepPartial<XmlParserHooks>): Promise<RNodeWithParent> => {
	const request = requestFromInput(input)
	return (await new SteppingSlicer({
		stepOfInterest: 'normalize',
		shell,
		request,
		hooks
	}).allRemainingSteps()).normalize.ast
}

export interface TestConfiguration extends MergeableRecord {
	/** the (inclusive) minimum version of R required to run this test, e.g., {@link MIN_VERSION_PIPE} */
	minRVersion:            string | undefined
	needsPackages:          string[]
	needsNetworkConnection: boolean
}

export const defaultTestConfiguration: TestConfiguration = {
	minRVersion:            undefined,
	needsPackages:          [],
	needsNetworkConnection: false
}

async function testRequiresPackages(shell: RShell, requiredPackages: string[], test: Mocha.Context) {
	shell.tryToInjectHomeLibPath()
	for(const pkg of requiredPackages) {
		if(!await shell.isPackageInstalled(pkg)) {
			console.warn(`Skipping test because package "${pkg}" is not installed (install it locally to get the tests to run).`)
			test.skip()
		}
	}
}

export async function ensureConfig(shell: RShell, test: Mocha.Context, userConfig?: Partial<TestConfiguration>): Promise<void> {
	const config = deepMergeObject(defaultTestConfiguration, userConfig)
	if(config.needsNetworkConnection) {
		await testRequiresNetworkConnection(test)
	}
	if(config.minRVersion !== undefined) {
		await testRequiresRVersion(shell, `>=${config.minRVersion}`, test)
	}
	if(config.needsPackages && config.needsPackages.length  > 0) {
		await testRequiresPackages(shell, config.needsPackages, test)
	}
}

/**
 * Comfort for {@link assertAst} to run the same test for multiple steps
 */
export function sameForSteps<T, S>(steps: S[], wanted: T): { step: S, wanted: T }[] {
	return steps.map(step => ({ step, wanted }))
}

/**
 * For a given input code this takes multiple ASTs depending on the respective normalizer step to run!
 *
 * @see sameForSteps
 */
export function assertAst(name: TestLabel | string, shell: RShell, input: string, expected: { step: typeof NORMALIZE | typeof DESUGAR_NORMALIZE, wanted: RExpressionList }[], userConfig?: Partial<TestConfiguration & {
	ignoreAdditionalTokens: boolean
}>): Mocha.Suite | Mocha.Test {
	const fullname = decorateLabelContext(name, ['desugar'])
	// the ternary operator is to support the legacy way I wrote these tests - by mirroring the input within the name
	return describe(`${fullname} (input: ${input})`, () => {
		for(const { step, wanted } of expected) {
			it(`${step.humanReadableName}`, async function() {
				await ensureConfig(shell, this, userConfig)

				const pipeline = new PipelineExecutor(createPipeline(PARSE_WITH_R_SHELL_STEP, step), {
					shell,
					request: requestFromInput(input)
				})
				const result = await pipeline.allRemainingSteps()
				const ast = result.normalize.ast

				assertAstEqualIgnoreSourceInformation(ast, wanted, !userConfig?.ignoreAdditionalTokens, () => `got: ${JSON.stringify(ast)}, vs. expected: ${JSON.stringify(wanted)}`)
			})
		}
	})
}

/** call within describeSession */
export function assertDecoratedAst<Decorated>(name: string, shell: RShell, input: string, expected: RNodeWithParent<Decorated>, userConfig?: Partial<TestConfiguration>, startIndexForDeterministicIds = 0): void {
	it(name, async function() {
		await ensureConfig(shell, this, userConfig)
		const result = await new SteppingSlicer({
			stepOfInterest: 'normalize',
			getId:          deterministicCountingIdGenerator(startIndexForDeterministicIds),
			shell,
			request:        requestFromInput(input),
		}).allRemainingSteps()

		const ast = result.normalize.ast

		assertAstEqualIgnoreSourceInformation(ast, expected, false, () => `got: ${JSON.stringify(ast)}, vs. expected: ${JSON.stringify(expected)}`)
	})
}

export function assertDataflow(
	name: string | TestLabel,
	shell: RShell,
	input: string,
	expected: DataflowGraph | { step: typeof LEGACY_STATIC_DATAFLOW | typeof V2_STATIC_DATAFLOW, wanted: DataflowGraph }[],
	userConfig?: Partial<TestConfiguration>,
	startIndexForDeterministicIds = 0
): void {
	const effectiveName = decorateLabelContext(name, ['dataflow'])
	// TODO: remove non-array version after transition
	if(!Array.isArray(expected)) {
		it(`${effectiveName} (input: ${JSON.stringify(input)})`, async function() {
			await ensureConfig(shell, this, userConfig)

			const info = await new PipelineExecutor(createPipeline(PARSE_WITH_R_SHELL_STEP, NORMALIZE, LEGACY_STATIC_DATAFLOW), {
				shell,
				request: requestFromInput(input),
				getId:   deterministicCountingIdGenerator(startIndexForDeterministicIds)
			}).allRemainingSteps()

			const report: DifferenceReport = expected.equals(info.dataflow.graph, true, { left: 'expected', right: 'got' })
			// with the try catch the diff graph is not calculated if everything is fine
			try {
				guard(report.isEqual(), () => `report:\n * ${report.comments()?.join('\n * ') ?? ''}`)
			} catch(e) {
				const diff = diffGraphsToMermaidUrl(
					{ label: 'expected', graph: expected },
					{ label: 'got', graph: info.dataflow.graph },
					info.normalize.idMap,
					`%% ${input.replace(/\n/g, '\n%% ')}\n`
				)
				console.error('diff:\n', diff)
				throw e
			}
		}).timeout('3min')
	} else {
		describe(`${effectiveName} (input: ${JSON.stringify(input)})`, () => {
			for(const { step, wanted } of expected) {
				it(`${step.humanReadableName}`, async function() {
					await ensureConfig(shell, this, userConfig)

					const info = await new PipelineExecutor(createPipeline(
						PARSE_WITH_R_SHELL_STEP,
						step.humanReadableName === V2_STATIC_DATAFLOW.humanReadableName ? DESUGAR_NORMALIZE : NORMALIZE, step
					), {
						shell,
						request: requestFromInput(input),
						getId:   deterministicCountingIdGenerator(startIndexForDeterministicIds)
					}).allRemainingSteps()

					const report: DifferenceReport = wanted.equals(info.dataflow.graph, true, {
						left:  'expected',
						right: 'got'
					})
					// with the try catch the diff graph is not calculated if everything is fine
					try {
						guard(report.isEqual(), () => `report:\n * ${report.comments()?.join('\n * ') ?? ''}`)
					} catch(e) {
						const diff = diffGraphsToMermaidUrl(
							{ label: 'expected', graph: wanted },
							{ label: 'got', graph: info.dataflow.graph },
							info.normalize.idMap,
							`%% ${input.replace(/\n/g, '\n%% ')}\n`
						)
						console.error('diff:\n', diff)
						throw e
					}

				}).timeout('3min')
			}
		})
	}
}


/** call within describeSession */
function printIdMapping(ids: NodeId[], map: DecoratedAstMap): string {
	return ids.map(id => `${id}: ${JSON.stringify(map.get(id)?.lexeme)}`).join(', ')
}

/**
 * Please note, that this executes the reconstruction step separately, as it predefines the result of the slice with the given ids.
 */
export function assertReconstructed(name: string, shell: RShell, input: string, ids: NodeId | NodeId[], expected: string, userConfig?: Partial<TestConfiguration>, getId: IdGenerator<NoInfo> = deterministicCountingIdGenerator(0)): Mocha.Test {
	const selectedIds = Array.isArray(ids) ? ids : [ids]
	return it(name, async function() {
		await ensureConfig(shell, this, userConfig)

		const result = await new SteppingSlicer({
			stepOfInterest: 'normalize',
			getId:          getId,
			request:        requestFromInput(input),
			shell
		}).allRemainingSteps()
		const reconstructed = NAIVE_RECONSTRUCT.processor({
			normalize: result.normalize,
			slice:     {
				decodedCriteria:   [],
				timesHitThreshold: 0,
				result:            new Set(selectedIds)
			}
		}, {})
		assert.strictEqual(reconstructed.code, expected, `got: ${reconstructed.code}, vs. expected: ${expected}, for input ${input} (ids: ${printIdMapping(selectedIds, result.normalize.idMap)})`)
	})
}


export function assertSliced(name: string, shell: RShell, input: string, criteria: SlicingCriteria, expected: string, getId: IdGenerator<NoInfo> = deterministicCountingIdGenerator(0)): Mocha.Test {
	return it(`${JSON.stringify(criteria)} ${name}`, async function() {
		const result = await new SteppingSlicer({
			stepOfInterest: LAST_STEP,
			getId,
			request:        requestFromInput(input),
			shell,
			criterion:      criteria,
		}).allRemainingSteps()

		try {
			assert.strictEqual(
				result.reconstruct.code, expected,
				`got: ${result.reconstruct.code}, vs. expected: ${expected}, for input ${input} (slice: ${printIdMapping(result.slice.decodedCriteria.map(({ id }) => id), result.normalize.idMap)}), url: ${graphToMermaidUrl(result.dataflow.graph, result.normalize.idMap, true, result.slice.result)}`
			)
		} catch(e) {
			console.error('vis-got:\n', graphToMermaidUrl(result.dataflow.graph, result.normalize.idMap))
			throw e
		}
	})
}
