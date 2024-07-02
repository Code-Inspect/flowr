import { assert } from 'chai'
import { emptyGraph } from '../../_helper/dataflow/dataflowgraph-builder'
import type { DataflowGraph } from '../../../../src/dataflow/graph/graph'
import { diffGraphsToMermaidUrl } from '../../../../src/util/mermaid/dfg'

function test(cmp: (x: boolean) => void, a: DataflowGraph, b: DataflowGraph, text: string) {
	try {
		cmp(a.equals(b))
	} catch(e) {
		// only calculate the dataflow graphs if it fails
		const diff = diffGraphsToMermaidUrl({ label: 'left', graph: a }, { label: 'right', graph: b }, '')
		console.error(text + '; diff:\n', diff)
		throw e
	}
}

describe('Equal', () => {
	function raw(name: string, a: DataflowGraph, b: DataflowGraph, text: string, cmp: (x: boolean) => void) {
		return it(name, () => {
			// as the comparison is relatively quick, we allow explicit checks for commutativity
			test(cmp, a, b, 'a;b' + text)
			test(cmp, b, a, 'b;a' + text)
		})
	}

	describe('Positive', () => {
		function eq(name: string, a: DataflowGraph, b: DataflowGraph) {
			raw(name, a, b, 'should be equal', x => assert.isTrue(x))
		}

		eq('Empty graphs', emptyGraph(), emptyGraph())
		eq('Same vertex', emptyGraph().use('0', 'x'), emptyGraph().use('0', 'x'))
	})
	describe('Negative', () => {
		function neq(name: string, a: DataflowGraph, b: DataflowGraph) {
			raw(name, a, b, 'should differ', x => assert.isFalse(x))
		}
		describe('More elements', () => {
			neq('Additional root vertex', emptyGraph(), emptyGraph().use('0', 'x'))
			neq('Additional non-root vertex', emptyGraph(), emptyGraph().use('0', 'x', {}, false))
			neq('Additional edge', emptyGraph(), emptyGraph().reads('0', '1'))
		})
		describe('Different elements', () => {
			describe('Different vertices', () => {
				const rhs = emptyGraph().use('0', 'x')
				neq('Id', emptyGraph().use('1', 'x'), rhs)
				neq('Name', emptyGraph().use('0', 'y'), rhs)
				neq('Control Dependency', emptyGraph().use('0', 'x', { controlDependencies: [{ id: '1', when: true }] }), rhs)
				neq('Tag', emptyGraph().constant('0'), rhs)
			})
			describe('Different edges', () => {
				const rhs = emptyGraph().reads('0', '1')
				neq('Source Id', emptyGraph().reads('2', '1'), rhs)
				neq('Target Id', emptyGraph().reads('0', '2'), rhs)
				neq('Type', emptyGraph().calls('0', '1'), rhs)
			})
		})
	})
})
