import { assertDataflow, withShell } from '../../../_helper/shell'
import { emptyGraph } from '../../../_helper/dataflow/dataflowgraph-builder'
import { argumentInCall, defaultEnv } from '../../../_helper/dataflow/environment-builder'
import { label } from '../../../_helper/label'
import { OperatorDatabase } from '../../../../../src/r-bridge/lang-4.x/ast/model/operators'
import { BuiltIn } from '../../../../../src/dataflow/environments/built-in'

describe('Lists with variable references', withShell(shell => {
	describe('read-read same variable', () => {
		assertDataflow(label('directly together', ['name-normal', 'newlines']), shell,
			'x\nx', emptyGraph()
				.use('0', 'x')
				.use('1', 'x')
		)

		assertDataflow(label('multiple occurrences of same variable', ['name-normal', 'newlines']), shell,
			'x\nx\nx', emptyGraph()
				.use('0', 'x')
				.use('1', 'x')
				.use('2', 'x')
		)
	})
	describe('def-def same variable', () => {
		assertDataflow(label('directly together', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'newlines']), shell,
			'x <- 1\nx <- 2', emptyGraph()
				.call('2', '<-', [argumentInCall('0'), argumentInCall('1')], { returns: ['0'], reads: [BuiltIn] })
				.call('5', '<-', [argumentInCall('3'), argumentInCall('4')], { returns: ['3'], reads: [BuiltIn], environment: defaultEnv().defineVariable('x', '0', '2') })
				.constant('1')
				.defineVariable('0', 'x', { definedBy: ['1', '2'] })
				.constant('4')
				.defineVariable('3', 'x', { definedBy: ['4', '5'] })
		)

		assertDataflow(label('multiple occurrences of same variable', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'newlines']), shell,
			'x <- 1\nx <- 3\n3\nx <- 9', emptyGraph()
				.call('2', '<-', [argumentInCall('0'), argumentInCall('1')], { returns: ['0'], reads: [BuiltIn] })
				.call('5', '<-', [argumentInCall('3'), argumentInCall('4')], { returns: ['3'], reads: [BuiltIn], environment: defaultEnv().defineVariable('x', '0', '2') })
				.call('9', '<-', [argumentInCall('7'), argumentInCall('8')], { returns: ['7'], reads: [BuiltIn], environment: defaultEnv().defineVariable('x', '3', '5') })
				.constant('1')
				.defineVariable('0', 'x', { definedBy: ['1', '2'] })
				.constant('4')
				.defineVariable('3', 'x', { definedBy: ['4', '5'] })
				.constant('6')
				.constant('8')
				.defineVariable('7', 'x', { definedBy: ['8', '9'] })
		)
	})
	describe('def followed by read', () => {
		assertDataflow(label('directly together', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'newlines']), shell,
			'x <- 1\nx',  emptyGraph()
				.use('3', 'x')
				.reads('3', '0')
				.call('2', '<-', [argumentInCall('0'), argumentInCall('1')], { returns: ['0'], reads: [BuiltIn] })
				.constant('1')
				.defineVariable('0', 'x', { definedBy: ['1', '2'] })
		)
		assertDataflow(label('redefinition links correctly', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'semicolons']), shell,
			'x <- 2; x <- 3; x',
			emptyGraph()
				.use('6', 'x')
				.reads('6', '3')
				.call('2', '<-', [argumentInCall('0'), argumentInCall('1')], { returns: ['0'], reads: [BuiltIn] })
				.call('5', '<-', [argumentInCall('3'), argumentInCall('4')], { returns: ['3'], reads: [BuiltIn], environment: defaultEnv().defineVariable('x', '0', '2') })
				.constant('1')
				.defineVariable('0', 'x', { definedBy: ['1', '2'] })
				.constant('4')
				.defineVariable('3', 'x', { definedBy: ['4', '5'] })
		)
		assertDataflow(label('multiple redefinition with circular definition', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'semicolons']), shell,
			'x <- 2; x <- x; x',
			emptyGraph()
				.use('4', 'x')
				.reads('4', '0')
				.use('6', 'x')
				.reads('6', '3')
				.call('2', '<-', [argumentInCall('0'), argumentInCall('1')], { returns: ['0'], reads: [BuiltIn] })
				.call('5', '<-', [argumentInCall('3'), argumentInCall('4')], { returns: ['3'], reads: [BuiltIn], environment: defaultEnv().defineVariable('x', '0', '2') })
				.constant('1')
				.defineVariable('0', 'x', { definedBy: ['1', '2'] })
				.defineVariable('3', 'x', { definedBy: ['4', '5'] })
		)
		assertDataflow(label('duplicate circular definition', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'semicolons']), shell,
			'x <- x; x <- x;',
			emptyGraph()
				.use('1', 'x')
				.use('4', 'x')
				.reads('4', '0')
				.call('2', '<-', [argumentInCall('0'), argumentInCall('1')], { returns: ['0'], reads: [BuiltIn] })
				.call('5', '<-', [argumentInCall('3'), argumentInCall('4')], { returns: ['3'], reads: [BuiltIn], environment: defaultEnv().defineVariable('x', '0', '2') })
				.defineVariable('0', 'x', { definedBy: ['1', '2'] })
				.defineVariable('3', 'x', { definedBy: ['4', '5'] })
		)
	})
	// potentially incorrect? redefinition appears correct in dataflow graph, but why is the {} still flagged up as an expression list?
	describe('Redefining expression lists', () => {
		assertDataflow(label('redefining {', ['name-escaped', ...OperatorDatabase['<-'].capabilities, 'formals-dot-dot-dot', 'implicit-return', 'numbers', 'newlines']),
			shell, `\`{\` <- function(...) 3
x <- 4
{
   x <- 2
   print(x)
}
print(x)`, emptyGraph()
				.use('16', 'x')
				.reads('16', '12')
				.use('21', 'x')
				.reads('21', '12')
				.call('6', '<-', [argumentInCall('0'), argumentInCall('5')], { returns: ['0'], reads: [BuiltIn] })
				.argument('6', ['5', '0'])
				.call('9', '<-', [argumentInCall('7'), argumentInCall('8')], { returns: ['7'], reads: [BuiltIn], environment: defaultEnv().defineFunction('{', '0', '6') })
				.argument('9', ['8', '7'])
				.call('14', '<-', [argumentInCall('12'), argumentInCall('13')], { returns: ['12'], reads: [BuiltIn], environment: defaultEnv().defineFunction('{', '0', '6').defineVariable('x', '7', '9') })
				.argument('14', ['13', '12'])
				.definesOnCall('14', '1')
				.argument('18', '16')
				.call('18', 'print', [argumentInCall('16')], { returns: ['16'], reads: [BuiltIn], environment: defaultEnv().defineFunction('{', '0', '6').defineVariable('x', '12', '14') })
				.definesOnCall('18', '1')
				.argument('19', '14')
				.argument('19', '18')
				.call('19', '{', [argumentInCall('14'), argumentInCall('18')], { returns: ['3'], reads: ['0'], environment: defaultEnv().defineFunction('{', '0', '6').defineVariable('x', '7', '9') })
				.calls('19', '5')
				.argument('23', '21')
				.call('23', 'print', [argumentInCall('21')], { returns: ['21'], reads: [BuiltIn], environment: defaultEnv().defineFunction('{', '0', '6').defineVariable('x', '12', '14') })
				.defineVariable('1', '...', { definedBy: [] }, false)
				.constant('3', undefined, false)
				.defineFunction('5', ['3'], {
					out:               [],
					in:                [{ nodeId: '3', name: undefined, controlDependencies: [] }],
					unknownReferences: [],
					entryPoint:        '3',
					graph:             new Set(['1', '3']),
					environment:       defaultEnv().pushEnv().defineParameter('...', '1', '2')
				})
				.defineVariable('0', '`{`', { definedBy: ['5', '6'] })
				.constant('8')
				.defineVariable('7', 'x', { definedBy: ['8', '9'] })
				.constant('13')
				.defineVariable('12', 'x', { definedBy: ['13', '14'] }))
	})
}))
