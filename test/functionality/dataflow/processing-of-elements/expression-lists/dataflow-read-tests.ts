import type { NodeId } from '../../../../../src'
import { assertDataflow, withShell } from '../../../_helper/shell'
import { emptyGraph } from '../../../_helper/dataflow/dataflowgraph-builder'

describe('Lists with variable references', withShell(shell => {
	describe('read-read same variable', () => {
		const sameGraph = (id1: NodeId, id2: NodeId) =>
			emptyGraph()
				.use(id1, 'x')
				.use(id2, 'x')
				.sameRead(id1, id2)
		assertDataflow('directly together', shell,
			'x\nx',
			sameGraph('0', '1')
		)
		assertDataflow('surrounded by uninteresting elements', shell,
			'3\nx\n1\nx\n2',
			sameGraph('1', '3')
		)
		assertDataflow('using braces', shell,
			'{ x }\n{{ x }}',
			sameGraph('0', '1')
		)
		assertDataflow('using braces and uninteresting elements', shell,
			'{ x + 2 }; 4 - { x }',
			sameGraph('0', '4')
		)

		assertDataflow('multiple occurrences of same variable', shell,
			'x\nx\n3\nx',
			emptyGraph()
				.use('0', 'x')
				.use('1', 'x')
				.use('3', 'x')
				.sameRead('0', '1')
				.sameRead('0', '3')
		)
	})
	describe('def-def same variable', () => {
		const sameGraph = (id1: NodeId, id2: NodeId, _definedAt: NodeId) =>
			emptyGraph()
				.defineVariable(id1, 'x')
				.defineVariable(id2, 'x')
				.sameDef(id1, id2)
		assertDataflow('directly together', shell,
			'x <- 1\nx <- 2',
			sameGraph('0', '3', '2')
		)
		assertDataflow('directly together with mixed sides', shell,
			'1 -> x\nx <- 2',
			sameGraph('1', '3', '2')
		)
		assertDataflow('surrounded by uninteresting elements', shell,
			'3\nx <- 1\n1\nx <- 3\n2',
			sameGraph('1', '5', '3')
		)
		assertDataflow('using braces', shell,
			'{ x <- 42 }\n{{ x <- 50 }}',
			sameGraph('0', '3', '2')
		)
		assertDataflow('using braces and uninteresting elements', shell,
			'5; { x <- 2 }; 17; 4 -> x; 9',
			sameGraph('1', '6', '3')
		)

		assertDataflow('multiple occurrences of same variable', shell,
			'x <- 1\nx <- 3\n3\nx <- 9',
			emptyGraph()
				.defineVariable('0', 'x')
				.defineVariable('3', 'x')
				.defineVariable('7', 'x')
				.sameDef('0', '3')
				.sameDef('3', '7')
		)
	})
	describe('def followed by read', () => {
		const sameGraph = (id1: NodeId, id2: NodeId, _definedAt: NodeId) =>
			emptyGraph()
				.defineVariable(id1, 'x')
				.use(id2, 'x')
				.reads(id2, id1)
		assertDataflow('directly together', shell,
			'x <- 1\nx',
			sameGraph('0', '3', '2')
		)
		assertDataflow('surrounded by uninteresting elements', shell,
			'3\nx <- 1\n1\nx\n2',
			sameGraph('1', '5', '3')
		)
		assertDataflow('using braces', shell,
			'{ x <- 1 }\n{{ x }}',
			sameGraph('0', '3', '2')
		)
		assertDataflow('using braces and uninteresting elements', shell,
			'{ x <- 2 }; 5; x',
			sameGraph('0', '4', '2')
		)
		assertDataflow('redefinition links correctly', shell,
			'x <- 2; x <- 3; x',
			emptyGraph()
				.defineVariable('0', 'x')
				.defineVariable('3', 'x')
				.use('6', 'x')
				.reads('6', '3')
				.sameDef('0', '3')
		)
		assertDataflow('multiple redefinition with circular definition', shell,
			'x <- 2; x <- x; x',
			emptyGraph()
				.defineVariable('0', 'x')
				.defineVariable('3', 'x')
				.use('4', 'x')
				.use('6', 'x')
				.reads('4', '0')
				.definedBy('3', '4')
				.sameDef('0', '3')
				.reads('6', '3')
		)
		assertDataflow('duplicate circular definition', shell,
			'x <- x; x <- x;',
			emptyGraph()
				.defineVariable('0', 'x')
				.use('1', 'x')
				.defineVariable('3', 'x')
				.use('4', 'x')
				.definedBy('0', '1')
				.definedBy('3', '4')
				.reads('4', '0')
				.sameDef('0', '3')
		)
	})
}))
