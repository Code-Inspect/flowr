import { assertDataflow, withShell } from '../../../_helper/shell'
import { emptyGraph } from '../../../_helper/dataflow/dataflowgraph-builder'
import { argumentInCall, defaultEnv } from '../../../_helper/dataflow/environment-builder'
import { BuiltIn } from '../../../../../src/dataflow'

describe('While', withShell(shell => {
	assertDataflow('simple constant while', shell, 'while (TRUE) 2', emptyGraph()
		.call('3', 'while', [argumentInCall('0'), argumentInCall('1')], { returns: [], reads: ['0', BuiltIn], onlyBuiltIn: true })
		.nse('3', '1')
		.constant('0')
		.constant('1', { controlDependency: [] })
	)
	assertDataflow('using variable in body', shell, 'while (TRUE) x', emptyGraph()
		.use('1', 'x', { controlDependencies: [] })
		.call('3', 'while', [argumentInCall('0'), argumentInCall('1')], { returns: [], reads: ['0', BuiltIn], onlyBuiltIn: true })
		.nse('3', '1')
		.constant('0')
	)
	assertDataflow('assignment in loop body', shell, 'while (TRUE) { x <- 3 }', emptyGraph()
		.call('5', '<-', [argumentInCall('3'), argumentInCall('4')], { returns: ['3'], reads: [BuiltIn], controlDependency: [] })
		.call('6', '{', [argumentInCall('5')], { returns: ['5'], reads: [BuiltIn], controlDependency: [] })
		.call('7', 'while', [argumentInCall('0'), argumentInCall('6')], { returns: [], reads: ['0', BuiltIn], onlyBuiltIn: true })
		.nse('7', '6')
		.constant('0')
		.constant('4', { controlDependency: ['7'] })
		.defineVariable('3', 'x', { definedBy: ['4', '5'], controlDependency: [] })
	)
	assertDataflow('def compare in loop', shell, 'while ((x <- x - 1) > 0) { x }', emptyGraph()
		.use('3', 'x')
		.use('12', 'x', { controlDependencies: [] })
		.reads('12', '2')
		.call('5', '-', [argumentInCall('3'), argumentInCall('4')], { returns: [], reads: [BuiltIn, '3', '4'], onlyBuiltIn: true })
		.call('6', '<-', [argumentInCall('2'), argumentInCall('5')], { returns: ['2'], reads: [BuiltIn] })
		.call('7', '(', [argumentInCall('6')], { returns: ['6'], reads: [BuiltIn] })
		.call('9', '>', [argumentInCall('7'), argumentInCall('8')], { returns: [], reads: [BuiltIn, '7', '8'], onlyBuiltIn: true })
		.call('13', '{', [argumentInCall('12')], { returns: ['12'], reads: [BuiltIn], controlDependency: [], environment: defaultEnv().defineVariable('x', '2', '6') })
		.call('14', 'while', [argumentInCall('9'), argumentInCall('13')], { returns: [], reads: ['9', BuiltIn], onlyBuiltIn: true })
		.nse('14', '13')
		.constant('4')
		.defineVariable('2', 'x', { definedBy: ['5', '6'] })
		.constant('8')
	)
	assertDataflow('Endless while loop with variables', shell, 'while(x) y', emptyGraph()
		.use('0', 'x')
		.use('1', 'y', { controlDependencies: [] })
		.argument('3', '0')
		.argument('3', '1')
		.call('3', 'while', [argumentInCall('0'), argumentInCall('1')], { returns: [], reads: ['0', BuiltIn], onlyBuiltIn: true })
		.nse('3', '1')
	)
}))
