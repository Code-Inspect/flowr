/**
 * Labels can be used whenever a test name is expected, to wrap around the original
 * string and link it to functionality it refers to. As this is currently work in
 * progress, no automated linkage or validation is performed.
 * @module
 */


import { DefaultMap } from '../../../src/util/defaultmap'
import type { FlowrCapabilityWithPath, SupportedFlowrCapabilityId } from '../../../src/r-bridge/data'
import { getAllCapabilities } from '../../../src/r-bridge/data'
import type { MergeableRecord } from '../../../src/util/objects'

// map flowr ids to the capabilities
const TheGlobalLabelMap: DefaultMap<string, TestLabel[]> = new DefaultMap(() => [])

const uniqueTestId = (() => {
	let id = 0
	return () => id++
})()


export type TestLabelContext = 'parse' | 'desugar' | 'dataflow' | 'other'
export interface TestLabel extends MergeableRecord {
	readonly id:           number
	readonly name:         string
	/** even if ids appear multiple times we only want to count each one once */
	readonly capabilities: ReadonlySet<SupportedFlowrCapabilityId>
	/** this is automatically set (hihi) by functions like `assertAst` to correctly derive what part of capability we check */
	readonly context:      Set<TestLabelContext>
}


/**
 * Wraps a test name with a unique identifier and label it with the given ids.
 * @param testname - the name of the test (`it`) to be labeled
 * @param ids      - the capability ids to attach to the test
 * @param context  - the context in which the test is run, if not given this returns the label information for a test-helper to attach it
 */
export function label(testname: string, ids: readonly SupportedFlowrCapabilityId[], context: readonly TestLabelContext[]): string
export function label(testname: string, ids: readonly SupportedFlowrCapabilityId[], context?: readonly TestLabelContext[]): TestLabel
export function label(testname: string, ids: readonly SupportedFlowrCapabilityId[], context?: readonly TestLabelContext[]): TestLabel | string {
	const capabilities: Set<SupportedFlowrCapabilityId> = new Set(ids)
	const label: TestLabel = {
		id:      uniqueTestId(),
		name:    testname,
		capabilities,
		context: context === undefined ? new Set() : new Set(context)
	}

	for(const i of capabilities) {
		TheGlobalLabelMap.get(i).push(label)
	}

	if(context === undefined) {
		return label
	} else {
		return getFullNameOfLabel(label)
	}
}

function getFullNameOfLabel(label: TestLabel): string {
	return `#${label.id} ${label.name} [${[...label.capabilities].join(', ')}]`
}


/**
 * Returns the full name of the testlabel and adds the respective contexts
 */
export function decorateLabelContext(label: TestLabel | string, context: readonly TestLabelContext[]): string {
	if(typeof label === 'string') {
		return label
	}

	for(const c of context) {
		label.context.add(c)
	}

	return getFullNameOfLabel(label)
}

function printIdRange(start: number, last: number): string {
	if(start === last) {
		return `#${start}`
	} else {
		return `#${start}-#${last}`
	}
}

function mergeConsecutiveIds(ids: readonly number[]): string {
	if(ids.length === 0) {
		return ''
	}

	const sorted = [...ids].sort((a, b) => a - b)
	const result: string[] = []
	let start: number = sorted[0]
	let last: number = start

	for(const id of sorted.slice(1)) {
		if(id === last + 1) {
			last = id
		} else {
			result.push(printIdRange(start, last))
			start = id
			last = id
		}
	}
	result.push(printIdRange(start, last))
	return `\x1b[36m${result.join('\x1b[m, \x1b[36m')}\x1b[m`
}

function printCapability(label: FlowrCapabilityWithPath, testNames: TestLabel[]) {
	const supportClaim = label.supported ? ` (claim: ${label.supported} supported)` : ''
	const paddedLabel = `${' '.repeat(label.path.length * 2 - 2)}[${label.path.join('/')}] ${label.name}${supportClaim}`
	const tests = testNames.length > 1 ? 'tests:' : 'test: '
	// we only have to warn if we claim to support but do not offer
	if(testNames.length === 0) {
		if(label.supported !== 'not' && label.supported !== undefined) {
			console.log(`\x1b[1;31m${paddedLabel} is not covered by any tests\x1b[0m`)
		} else {
			console.log(`${paddedLabel}`)
		}
		return
	}

	// group by contexts
	const contextMap = new DefaultMap<TestLabelContext, TestLabel[]>(() => [])
	for(const t of testNames) {
		for(const c of t.context) {
			contextMap.get(c).push(t)
		}
	}
	let formattedTestNames = ''
	for(const [context, tests] of contextMap.entries()) {
		const formatted = mergeConsecutiveIds(tests.map(t => t.id))
		formattedTestNames += `\n${' '.repeat(label.path.length * 2 - 2)}      - ${context} [${tests.length}]: ${formatted}`
	}

	console.log(`\x1b[1m${paddedLabel}\x1b[0m is covered by ${testNames.length} ${tests}${formattedTestNames}`)
}

function printLabelSummary(): void {
	console.log('== Test Capability Coverage ' + '='.repeat(80))
	// only list those for which we have a support claim
	const allCapabilities = [...getAllCapabilities()]
	const entries = allCapabilities.map(c => [c, TheGlobalLabelMap.get(c.id)] as const)

	for(const [capability, testNames] of entries) {
		printCapability(capability, testNames)
	}
}

after(printLabelSummary)
process.on('exit', printLabelSummary)
