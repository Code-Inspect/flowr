import { it } from 'mocha'
import { testRequiresNetworkConnection } from './network'
import type { DeepPartial } from 'ts-essentials'
import {
	deterministicCountingIdGenerator, requestFromInput,
	RShell
} from '../../../src/r-bridge'
import type {
	DecoratedAstMap, fileProtocol,
	IdGenerator,
	NodeId,
	NoInfo,
	RExpressionList,
	RNode,
	RNodeWithParent,
	XmlParserHooks

} from '../../../src/r-bridge'

import { assert } from 'chai'
import type { DataflowGraph } from '../../../src/dataflow'
import { diffGraphsToMermaidUrl, graphToMermaidUrl } from '../../../src/dataflow'
import type { SlicingCriteria } from '../../../src/slicing'
import { testRequiresRVersion } from './version'
import type { MergeableRecord } from '../../../src/util/objects'
import { deepMergeObject } from '../../../src/util/objects'
import { executeSingleSubStep, LAST_STEP, SteppingSlicer } from '../../../src/core'
import { guard } from '../../../src/util/assert'
import type { DifferenceReport } from '../../../src/util/diff'

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
		const shell = new RShell()
		fn(shell)
		after(() => {
			shell.close()
		})
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

export const retrieveNormalizedAst = async(shell: RShell, input: `${typeof fileProtocol}${string}` | string, hooks?: DeepPartial<XmlParserHooks>): Promise<RNodeWithParent> => {
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
	const config = deepMergeObject<Partial<TestConfiguration>>(defaultTestConfiguration, userConfig)
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

/** call within describeSession */
export function assertAst(name: string, shell: RShell, input: string, expected: RExpressionList, userConfig?: Partial<TestConfiguration & {
	ignoreAdditionalTokens: boolean
}>): Mocha.Test {
	// the ternary operator is to support the legacy way I wrote these tests - by mirroring the input within the name
	return it(name === input ? name : `${name} (input: ${input})`, async function() {
		await ensureConfig(shell, this, userConfig)
		const ast = await retrieveNormalizedAst(shell, input)
		assertAstEqualIgnoreSourceInformation(ast, expected, !userConfig?.ignoreAdditionalTokens, () => `got: ${JSON.stringify(ast)}, vs. expected: ${JSON.stringify(expected)}`)
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

export function assertDataflow(name: string, shell: RShell, input: string, expected: DataflowGraph, userConfig?: Partial<TestConfiguration>, startIndexForDeterministicIds = 0): void {
	it(`${name} (input: ${JSON.stringify(input)})`, async function() {
		await ensureConfig(shell, this, userConfig)

		const info = await new SteppingSlicer({
			stepOfInterest: 'dataflow',
			request:        requestFromInput(input),
			shell,
			getId:          deterministicCountingIdGenerator(startIndexForDeterministicIds),
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
}


/** call within describeSession */
function printIdMapping(ids: NodeId[], map: DecoratedAstMap): string {
	return ids.map(id => `${id}: ${JSON.stringify(map.get(id)?.lexeme)}`).join(', ')
}

/**
 * Please note, that theis executes the reconstruction step separately, as it predefines the result of the slice with the given ids.
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
		const reconstructed = executeSingleSubStep('reconstruct', result.normalize,  new Set(selectedIds))
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
