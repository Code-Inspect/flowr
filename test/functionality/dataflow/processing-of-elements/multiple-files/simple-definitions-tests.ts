import { assertDataflow, withShell } from '../../../_helper/shell'
import { label } from '../../../_helper/label'
import { emptyGraph } from '../../../_helper/dataflow/dataflowgraph-builder'
import { argumentInCall } from '../../../_helper/dataflow/environment-builder'

describe('Simple Defs in Multiple Files', withShell(shell => {

	assertDataflow(label('two files', ['name-normal', 'numbers']), shell,
		[
			{ request: 'text', content: 'x <- 42' },
			{ request: 'text', content: 'y <- 3' },
			{ request: 'text', content: 'print(x + y)' },
		],
		emptyGraph()
			.use('-inline-@root-2-1')
			.reads('-inline-@root-2-1', '0')
			.use('-inline-@root-2-2')
			.reads('-inline-@root-2-2', '-inline-@root-1-0')
			.call('2', '<-', [argumentInCall('0'), argumentInCall('1')], { returns: ['0'], reads: [], onlyBuiltIn: true })
			.argument('2', ['1', '0'])
			.call('-inline-@root-1-2', '<-', [argumentInCall('-inline-@root-1-0'), argumentInCall('-inline-@root-1-1')], { returns: ['-inline-@root-1-0'], reads: [], onlyBuiltIn: true })
			.argument('-inline-@root-1-2', ['-inline-@root-1-1', '-inline-@root-1-0'])
			.argument('-inline-@root-2-3', '-inline-@root-2-1')
			.argument('-inline-@root-2-3', '-inline-@root-2-2')
			.call('-inline-@root-2-3', '+', [argumentInCall('-inline-@root-2-1'), argumentInCall('-inline-@root-2-2')], { returns: [], reads: ['-inline-@root-2-1', '-inline-@root-2-2'], onlyBuiltIn: true })
			.argument('-inline-@root-2-5', '-inline-@root-2-3')
			.call('-inline-@root-2-5', 'print', [argumentInCall('-inline-@root-2-3')], { returns: ['-inline-@root-2-3'], reads: [], onlyBuiltIn: true })
			.constant('1')
			.defineVariable('0', 'x', { definedBy: ['1', '2'] })
			.constant('-inline-@root-1-1')
			.defineVariable('-inline-@root-1-0', 'y', { definedBy: ['-inline-@root-1-1', '-inline-@root-1-2'] })
	)
}))
