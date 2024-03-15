import { assertDataflow, withShell } from '../../../_helper/shell'
import { emptyGraph } from '../../../_helper/dataflow/dataflowgraph-builder'

describe('while', withShell(shell => {
	assertDataflow('simple constant while', shell,
		'while (TRUE) 2',
		emptyGraph()
	)
	assertDataflow('using variable in body', shell,
		'while (TRUE) x',
		emptyGraph().use('1', 'x', { controlDependency: [] })
	)
	assertDataflow('assignment in loop body', shell,
		'while (TRUE) { x <- 3 }',
		emptyGraph().defineVariable('1', 'x', { controlDependency: [] })
	)
	assertDataflow('def compare in loop', shell, 'while ((x <- x - 1) > 0) { x }',
		emptyGraph()
			.defineVariable('0', 'x')
			.use('1', 'x')
			.use('7', 'x', { controlDependency: [] })
			.reads('7', '0')
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
			.use('1', 'y', { controlDependency: [] })
	)
}))
