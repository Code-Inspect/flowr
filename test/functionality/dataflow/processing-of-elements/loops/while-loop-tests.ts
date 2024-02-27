import { initializeCleanEnvironments } from '../../../../../src/dataflow'
import { define } from '../../../../../src/dataflow/environments'
import { LocalScope } from '../../../../../src/dataflow/environments/scopes'
import { assertDataflow, withShell } from '../../../_helper/shell'
import { emptyGraph } from '../../../_helper/dataflowgraph-builder'
import { variable } from '../../../_helper/environment-builder'

describe('while', withShell(shell => {
	assertDataflow('simple constant while', shell,
		'while (TRUE) 2',
		emptyGraph()
	)
	assertDataflow('using variable in body', shell,
		'while (TRUE) x',
		emptyGraph().use('1', 'x', { when: 'maybe' })
	)
	assertDataflow('assignment in loop body', shell,
		'while (TRUE) { x <- 3 }',
		emptyGraph().defineVariable('1', 'x', LocalScope, { when: 'maybe' })
	)
	assertDataflow('def compare in loop', shell, 'while ((x <- x - 1) > 0) { x }',
		emptyGraph()
			.defineVariable('0', 'x')
			.use('1', 'x')
			.use('7', 'x', { when: 'maybe', environment: define(variable('x', '4', '0'), LocalScope, initializeCleanEnvironments()) })
			.reads('7', '0', 'maybe')
			.definedBy('0', '1')
	)
	assertDataflow('Endless while loop',
		shell,
		'while(TRUE) 1',
		emptyGraph()
	)
	assertDataflow('Endless while loop with variables',
		shell,
		'while(x) y',
		emptyGraph()
			.use('0', 'x')
			.use('1', 'y', { when: 'maybe' })
	)
}))
