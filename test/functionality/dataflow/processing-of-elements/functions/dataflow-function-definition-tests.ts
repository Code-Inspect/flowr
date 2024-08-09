import { assertDataflow, withShell } from '../../../_helper/shell'
import { emptyGraph } from '../../../_helper/dataflow/dataflowgraph-builder'
import { argumentInCall, defaultEnv } from '../../../_helper/dataflow/environment-builder'
import { label } from '../../../_helper/label'
import { BuiltIn } from '../../../../../src/dataflow/environments/built-in'
import { OperatorDatabase } from '../../../../../src/r-bridge/lang-4.x/ast/model/operators'
import { EmptyArgument } from '../../../../../src/r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import { UnnamedFunctionCallPrefix } from '../../../../../src/dataflow/internal/process/functions/call/unnamed-call-handling'
import { MIN_VERSION_LAMBDA } from '../../../../../src/r-bridge/lang-4.x/ast/model/versions'

describe('Function Definition', withShell(shell => {
	describe('Only functions', () => {
		assertDataflow(label('unknown read in function', ['normal-definition', 'implicit-return', 'name-normal']),
			shell, 'function() { x }', emptyGraph()
				.use('2', 'x', undefined, false)
				.argument('3', '2')
				.call('3', '{', [argumentInCall('2')], { returns: ['2'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
				.defineFunction('4', ['3'], {
					out:               [],
					in:                [{ nodeId: '2', name: 'x', controlDependencies: [] }],
					unknownReferences: [],
					entryPoint:        '3',
					graph:             new Set(['2', '3']),
					environment:       defaultEnv().pushEnv()
				})
		)

		assertDataflow(label('read of parameter', ['formals-named', 'implicit-return', 'name-normal']),
			shell, 'function(x) { x }', emptyGraph()
				.use('4', 'x', undefined, false)
				.reads('4', '0')
				.argument('5', '4')
				.call('5', '{', [argumentInCall('4')], { returns: ['4'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('x', '0', '1') }, false)
				.defineVariable('0', 'x', { definedBy: [] }, false)
				.defineFunction('6', ['5'], {
					out:               [],
					in:                [],
					unknownReferences: [],
					entryPoint:        '5',
					graph:             new Set(['0', '4', '5']),
					environment:       defaultEnv().pushEnv().defineParameter('x', '0', '1')
				})
		)
		assertDataflow(label('read of parameter in return', ['formals-named', 'return', 'name-normal']),
			shell, 'function(x) { return(x) }',  emptyGraph()
				.use('5', 'x', undefined, false)
				.reads('5', '0')
				.argument('7', '5')
				.call('7', 'return', [argumentInCall('5')], { returns: ['5'], reads: [BuiltIn], onlyBuiltIn: true, environment: defaultEnv().pushEnv().defineParameter('x', '0', '1') }, false)
				.argument('8', '7')
				.call('8', '{', [argumentInCall('7')], { returns: ['7'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('x', '0', '1') }, false)
				.defineVariable('0', 'x', { definedBy: [] }, false)
				.defineFunction('9', ['8'], {
					out:               [],
					in:                [],
					unknownReferences: [],
					entryPoint:        '8',
					graph:             new Set(['0', '5', '7', '8']),
					environment:       defaultEnv().pushEnv().defineParameter('x', '0', '1')
				})
		)

		describe('x', () => {
			assertDataflow(label('return parameter named', ['formals-named', 'return', 'named-arguments']),
				shell, 'function(x) { return(x=x) }',  emptyGraph()
					.use('6', 'x', undefined, false)
					.reads('6', '0')
					.use('7', 'x', undefined, false)
					.reads('7', '6')
					.call('8', 'return', [argumentInCall('7', { name: 'x' } )], { returns: ['7'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('x', '0', '1') }, false)
					.argument('8', '7')
					.call('9', '{', [argumentInCall('8')], { returns: ['8'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('x', '0', '1') }, false)
					.defineVariable('0', 'x', { definedBy: [] }, false)
					.defineFunction('10', ['9'], {
						out:               [],
						in:                [],
						unknownReferences: [],
						entryPoint:        '9',
						graph:             new Set(['0', '6', '7', '8', '9']),
						environment:       defaultEnv().pushEnv().defineParameter('x', '0', '1')
					})
			)
		})

		const envWithoutParams = defaultEnv().pushEnv()
		const envWithXParam = envWithoutParams.defineParameter('x', '0', '1')
		const envWithXYParam = envWithXParam.defineParameter('y', '2', '3')
		const envWithXYZParam = envWithXYParam.defineParameter('z', '4', '5')

		assertDataflow(label('read of one parameter', ['formals-named', 'implicit-return', 'name-normal']),
			shell, 'function(x,y,z) y',
			emptyGraph()
				.defineFunction('8', ['6'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					entryPoint:        '8',
					graph:             new Set(['0', '2', '4', '6']),
					environment:       envWithXYZParam
				})
				.defineVariable('0', 'x', { },  false)
				.defineVariable('2', 'y', { },  false)
				.defineVariable('4', 'z', { },  false)
				.use('6', 'y', { }, false)
				.reads('6', '2')
		)
	})
	describe('Scoping of body', () => {
		assertDataflow(label('previously defined read in function', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'semicolons', 'normal-definition', 'implicit-return']),
			shell, 'x <- 3; function() { x }', emptyGraph()
				.use('5', 'x', undefined, false)
				.call('2', '<-', [argumentInCall('0'), argumentInCall('1')], { returns: ['0'], reads: [BuiltIn] })
				.argument('2', ['1', '0'])
				.argument('6', '5')
				.call('6', '{', [argumentInCall('5')], { returns: ['5'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
				.constant('1')
				.defineVariable('0', 'x', { definedBy: ['1', '2'] })
				.defineFunction('7', ['6'], {
					out:               [],
					in:                [{ nodeId: '5', name: 'x', controlDependencies: [] }],
					unknownReferences: [],
					entryPoint:        '6',
					graph:             new Set(['5', '6']),
					environment:       defaultEnv().pushEnv()
				})
		)
		assertDataflow(label('local define with <- in function, read after', ['normal-definition', 'semicolons', 'name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers']),
			shell, 'function() { x <- 3; }; x', emptyGraph()
				.use('7', 'x')
				.call('4', '<-', [argumentInCall('2'), argumentInCall('3')], { returns: ['2'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
				.call('5', '{', [argumentInCall('4')], { returns: ['4'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
				.constant('3', undefined, false)
				.defineVariable('2', 'x', { definedBy: ['3', '4'] }, false)
				.defineFunction('6', ['5'], {
					out:               [],
					in:                [],
					unknownReferences: [],
					entryPoint:        '5',
					graph:             new Set(['3', '2', '4', '5']),
					environment:       defaultEnv().pushEnv().defineVariable('x', '2', '4')
				})
		)
		assertDataflow(label('local define with = in function, read after', ['normal-definition', ...OperatorDatabase['='].capabilities, 'semicolons', 'name-normal', 'numbers']), shell, 'function() { x = 3; }; x', emptyGraph()
			.use('7', 'x')
			.call('4', '=', [argumentInCall('2'), argumentInCall('3')], { returns: ['2'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
			.call('5', '{', [argumentInCall('4')], { returns: ['4'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
			.constant('3', undefined, false)
			.defineVariable('2', 'x', { definedBy: ['3', '4'] }, false)
			.defineFunction('6', ['5'], {
				out:               [],
				in:                [],
				unknownReferences: [],
				entryPoint:        '5',
				graph:             new Set(['3', '2', '4', '5']),
				environment:       defaultEnv().pushEnv().defineVariable('x', '2', '4')
			})
		)

		assertDataflow(label('local define with -> in function, read after', ['normal-definition', 'numbers', ...OperatorDatabase['->'].capabilities, 'semicolons', 'name-normal']), shell, 'function() { 3 -> x; }; x',  emptyGraph()
			.use('7', 'x')
			.call('4', '->', [argumentInCall('2'), argumentInCall('3')], { returns: ['3'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
			.call('5', '{', [argumentInCall('4')], { returns: ['4'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
			.constant('2', undefined, false)
			.defineVariable('3', 'x', { definedBy: ['2', '4'] }, false)
			.defineFunction('6', ['5'], {
				out:               [],
				in:                [],
				unknownReferences: [],
				entryPoint:        '5',
				graph:             new Set(['2', '3', '4', '5']),
				environment:       defaultEnv().pushEnv().defineVariable('x', '3', '4')
			})
		)
		assertDataflow(label('global define with <<- in function, read after', ['normal-definition', 'name-normal', 'numbers', ...OperatorDatabase['<<-'].capabilities, 'semicolons', 'side-effects-in-function-call']), shell, 'function() { x <<- 3; }; x',  emptyGraph()
			.use('7', 'x')
			.call('4', '<<-', [argumentInCall('2'), argumentInCall('3')], { returns: ['2'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
			.call('5', '{', [argumentInCall('4')], { returns: ['4'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
			.constant('3', undefined, false)
			.defineVariable('2', 'x', { definedBy: ['3', '4'] }, false)
			.defineFunction('6', ['5'], {
				out:               [],
				in:                [],
				unknownReferences: [],
				entryPoint:        '5',
				graph:             new Set(['3', '2', '4', '5']),
				environment:       defaultEnv().defineVariable('x', '2', '4').pushEnv()
			}, { environment: defaultEnv().defineVariable('x', '2', '4') })
		)
		assertDataflow(label('global define with ->> in function, read after', ['normal-definition', 'numbers', ...OperatorDatabase['->>'].capabilities, 'semicolons', 'name-normal', 'side-effects-in-function-call']), shell, 'function() { 3 ->> x; }; x', emptyGraph()
			.use('7', 'x')
			.call('4', '->>', [argumentInCall('2'), argumentInCall('3')], { returns: ['3'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
			.call('5', '{', [argumentInCall('4')], { returns: ['4'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
			.constant('2', undefined, false)
			.defineVariable('3', 'x', { definedBy: ['2', '4'] }, false)
			.defineFunction('6', ['5'], {
				out:               [],
				in:                [],
				unknownReferences: [],
				entryPoint:        '5',
				graph:             new Set(['2', '3', '4', '5']),
				environment:       defaultEnv().defineVariable('x', '3', '4').pushEnv()
			}, { environment: defaultEnv().defineVariable('x', '3', '4') })
		)
		assertDataflow(label('shadow in body',  ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'semicolons', 'normal-definition']), shell, 'x <- 2; function() { x <- 3; x }; x',  emptyGraph()
			.use('8', 'x', undefined, false)
			.reads('8', '5')
			.use('11', 'x')
			.reads('11', '0')
			.call('2', '<-', [argumentInCall('0'), argumentInCall('1')], { returns: ['0'], reads: [BuiltIn] })
			.call('7', '<-', [argumentInCall('5'), argumentInCall('6')], { returns: ['5'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
			.call('9', '{', [argumentInCall('7'), argumentInCall('8')], { returns: ['8'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineVariable('x', '5', '7') }, false)
			.constant('1')
			.defineVariable('0', 'x', { definedBy: ['1', '2'] })
			.constant('6', undefined, false)
			.defineVariable('5', 'x', { definedBy: ['6', '7'] }, false)
			.defineFunction('10', ['9'], {
				out:               [],
				in:                [],
				unknownReferences: [],
				entryPoint:        '9',
				graph:             new Set(['6', '5', '7', '8', '9']),
				environment:       defaultEnv().pushEnv().defineVariable('x', '5', '7')
			})
		)
		assertDataflow(label('shadow in body with closure', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'semicolons', 'normal-definition']), shell, 'x <- 2; function() { x <- x; x }; x',  emptyGraph()
			.use('6', 'x', undefined, false)
			.use('8', 'x', undefined, false)
			.reads('8', '5')
			.use('11', 'x')
			.reads('11', '0')
			.call('2', '<-', [argumentInCall('0'), argumentInCall('1')], { returns: ['0'], reads: [BuiltIn] })
			.call('7', '<-', [argumentInCall('5'), argumentInCall('6')], { returns: ['5'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
			.call('9', '{', [argumentInCall('7'), argumentInCall('8')], { returns: ['8'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineVariable('x', '5', '7') }, false)
			.constant('1')
			.defineVariable('0', 'x', { definedBy: ['1', '2'] })
			.defineVariable('5', 'x', { definedBy: ['6', '7'] }, false)
			.defineFunction('10', ['9'], {
				out:               [],
				in:                [{ nodeId: '6', name: 'x', controlDependencies: [] }],
				unknownReferences: [],
				entryPoint:        '9',
				graph:             new Set(['6', '5', '7', '8', '9']),
				environment:       defaultEnv().pushEnv().defineVariable('x', '5', '7')
			})
		)
	})
	describe('Scoping of parameters', () => {
		assertDataflow(label('parameter shadows', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'semicolons', 'formals-named', 'implicit-return']), shell, 'x <- 3; function(x) { x }',  emptyGraph()
			.use('7', 'x', undefined, false)
			.reads('7', '3')
			.call('2', '<-', [argumentInCall('0'), argumentInCall('1')], { returns: ['0'], reads: [BuiltIn] })
			.argument('2', ['1', '0'])
			.argument('8', '7')
			.call('8', '{', [argumentInCall('7')], { returns: ['7'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('x', '3', '4') }, false)
			.constant('1')
			.defineVariable('0', 'x', { definedBy: ['1', '2'] })
			.defineVariable('3', 'x', { definedBy: [] }, false)
			.defineFunction('9', ['8'], {
				out:               [],
				in:                [],
				unknownReferences: [],
				entryPoint:        '8',
				graph:             new Set(['3', '7', '8']),
				environment:       defaultEnv().pushEnv().defineParameter('x', '3', '4')
			})
		)
	})
	describe('Access dot-dot-dot', () => {
		assertDataflow(label('parameter shadows', ['formals-dot-dot-dot', 'implicit-return']), shell, 'function(...) { ..11 }',  emptyGraph()
			.use('4', '..11', undefined, false)
			.reads('4', '0')
			.argument('5', '4')
			.call('5', '{', [argumentInCall('4')], { returns: ['4'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('...', '0', '1') }, false)
			.defineVariable('0', '...', { definedBy: [] }, false)
			.defineFunction('6', ['5'], {
				out:               [],
				in:                [{ nodeId: '4', name: '..11', controlDependencies: [] }],
				unknownReferences: [],
				entryPoint:        '5',
				graph:             new Set(['0', '4', '5']),
				environment:       defaultEnv().pushEnv().defineParameter('...', '0', '1')
			})
		)
	})
	describe('Using named arguments', () => {
		assertDataflow(label('Read first parameter', ['formals-default', 'implicit-return', 'name-normal']), shell, 'function(a=3, b=a) { b }',  emptyGraph()
			.use('4', 'a', undefined, false)
			.reads('4', '0')
			.use('8', 'b', undefined, false)
			.reads('8', '3')
			.call('9', '{', [argumentInCall('8')], { returns: ['8'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('a', '0', '2').defineParameter('b', '3', '5') }, false)
			.defineVariable('0', 'a', { definedBy: ['1'] }, false)
			.constant('1', undefined, false)
			.defineVariable('3', 'b', { definedBy: ['4'] }, false)
			.defineFunction('10', ['9'], {
				out:               [],
				in:                [],
				unknownReferences: [],
				entryPoint:        '9',
				graph:             new Set(['0', '1', '3', '4', '8', '9']),
				environment:       defaultEnv().pushEnv().defineParameter('a', '0', '2').defineParameter('b', '3', '5')
			})
		)

		assertDataflow(label('Read later definition', ['formals-named', 'name-normal', 'name-normal', 'numbers', ...OperatorDatabase['<-'].capabilities, 'semicolons', 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities]), shell, 'function(a=b, m=3) { b <- 1; a; b <- 5; a + 1 }', emptyGraph()
			.use('1', 'b', undefined, false)
			.reads('1', '8')
			.use('11', 'a', undefined, false)
			.reads('11', '0')
			.use('15', 'a', undefined, false)
			.reads('15', '0')
			.call('10', '<-', [argumentInCall('8'), argumentInCall('9')], { returns: ['8'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('a', '0', '2').defineParameter('m', '3', '5') }, false)
			.call('14', '<-', [argumentInCall('12'), argumentInCall('13')], { returns: ['12'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('a', '0', '2').defineParameter('m', '3', '5').defineVariable('b', '8', '10') }, false)
			.call('17', '+', [argumentInCall('15'), argumentInCall('16')], { returns: [], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('a', '0', '2').defineParameter('m', '3', '5').defineVariable('b', '12', '14') }, false)
			.reads('17', ['15', '16'])
			.call('18', '{', [argumentInCall('10'), argumentInCall('11'), argumentInCall('14'), argumentInCall('17')], { returns: ['17'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('a', '0', '2').defineParameter('m', '3', '5').defineVariable('b', '12', '14') }, false)
			.defineVariable('0', 'a', { definedBy: ['1'] }, false)
			.defineVariable('3', 'm', { definedBy: ['4'] }, false)
			.constant('4', undefined, false)
			.constant('9', undefined, false)
			.defineVariable('8', 'b', { definedBy: ['9', '10'] }, false)
			.constant('13', undefined, false)
			.defineVariable('12', 'b', { definedBy: ['13', '14'] }, false)
			.constant('16', undefined, false)
			.defineFunction('19', ['18'], {
				out:               [],
				in:                [],
				unknownReferences: [],
				entryPoint:        '18',
				graph:             new Set(['0', '1', '3', '4', '9', '8', '10', '11', '13', '12', '14', '15', '16', '17', '18']),
				environment:       defaultEnv().pushEnv().defineParameter('a', '0', '2').defineParameter('m', '3', '5').defineVariable('b', '12', '14')
			})
		)
	})
	describe('Using special argument', () => {
		assertDataflow(label('Return ...', ['formals-named', 'formals-dot-dot-dot', 'unnamed-arguments', 'implicit-return']), shell, 'function(a, ...) { foo(...) }',  emptyGraph()
			.use('7', '...', undefined, false)
			.reads('7', '2')
			.argument('9', '7')
			.call('9', 'foo', [argumentInCall('7')], { returns: [], reads: [], environment: defaultEnv().pushEnv().defineParameter('a', '0', '1').defineParameter('...', '2', '3') }, false)
			.call('10', '{', [argumentInCall('9')], { returns: ['9'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('a', '0', '1').defineParameter('...', '2', '3') }, false)
			.defineVariable('0', 'a', { definedBy: [] }, false)
			.defineVariable('2', '...', { definedBy: [] }, false)
			.defineFunction('11', ['10'], {
				out:               [],
				in:                [{ nodeId: '9', name: 'foo', controlDependencies: [] }],
				unknownReferences: [],
				entryPoint:        '10',
				graph:             new Set(['0', '2', '7', '9', '10']),
				environment:       defaultEnv().pushEnv().defineParameter('a', '0', '1').defineParameter('...', '2', '3')
			})
		)
	})
	describe('Bind environment to correct exit point', () => {
		assertDataflow(label('Two possible exit points to bind y closure', ['normal-definition', 'name-normal', ...OperatorDatabase['<-'].capabilities, 'implicit-return', 'if', 'return', 'closures']), shell, `function() {
  g <- function() { y }
  y <- 5
  if(z)
    return(g)
  y <- 3
  g
}`, emptyGraph()
			.use('5', 'y', undefined, false)
			.reads('5', ['9', '19'])
			.use('12', 'z', undefined, false)
			.use('14', 'g', undefined, false)
			.reads('14', '2')
			.use('22', 'g', { controlDependencies: [] }, false)
			.reads('22', '2')
			.call('6', '{', [argumentInCall('5')], { returns: ['5'], reads: [BuiltIn], environment: defaultEnv().pushEnv().pushEnv() }, false)
			.call('8', '<-', [argumentInCall('2'), argumentInCall('7')], { returns: ['2'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
			.call('11', '<-', [argumentInCall('9'), argumentInCall('10')], { returns: ['9'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineFunction('g', '2', '8') }, false)
			.call('16', 'return', [argumentInCall('14')], { returns: ['14'], reads: [BuiltIn], controlDependencies: [{ id: '18', when: true }], environment: defaultEnv().pushEnv().defineFunction('g', '2', '8').defineVariable('y', '9', '11') }, false)
			.call('18', 'if', [argumentInCall('12'), argumentInCall('16'), EmptyArgument], { returns: ['16'], reads: ['12', BuiltIn], onlyBuiltIn: true, environment: defaultEnv().pushEnv().defineFunction('g', '2', '8').defineVariable('y', '9', '11') }, false)
			.call('21', '<-', [argumentInCall('19'), argumentInCall('20')], { returns: ['19'], reads: [BuiltIn], controlDependencies: [], environment: defaultEnv().pushEnv().defineFunction('g', '2', '8').defineVariable('y', '9', '11') }, false)
			.call('23', '{', [argumentInCall('8'), argumentInCall('11'), argumentInCall('18'), argumentInCall('21'), argumentInCall('22')], { returns: ['22'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineFunction('g', '2', '8').defineVariable('y', '9', '11').defineVariable('y', '19', '21', []) }, false)
			.returns('23', '16')
			.defineFunction('7', ['6'], {
				out:               [],
				in:                [],
				unknownReferences: [],
				entryPoint:        '6',
				graph:             new Set(['5', '6']),
				environment:       defaultEnv().pushEnv().pushEnv()
			}, { environment: defaultEnv().pushEnv() }, false)
			.defineVariable('2', 'g', { definedBy: ['7', '8'] }, false)
			.constant('10', undefined, false)
			.defineVariable('9', 'y', { definedBy: ['10', '11'] }, false)
			.constant('20', undefined, false)
			.defineVariable('19', 'y', { definedBy: ['20', '21'], controlDependencies: [] }, false)
			.defineFunction('24', ['23'], {
				out:               [],
				in:                [{ nodeId: '12', name: 'z', controlDependencies: [] }],
				unknownReferences: [],
				entryPoint:        '23',
				graph:             new Set(['7', '2', '8', '10', '9', '11', '12', '14', '16', '18', '20', '19', '21', '22', '23']),
				environment:       defaultEnv().pushEnv().defineFunction('g', '2', '8').defineVariable('y', '9', '11').defineVariable('y', '19', '21', [])
			})
		)
	})
	describe('Late binding of environment variables', () => {
		assertDataflow(label('define after function definition', ['normal-definition', 'implicit-return', 'semicolons', 'name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers']), shell, 'function() { x }; x <- 3',  emptyGraph()
			.use('2', 'x', undefined, false)
			.call('3', '{', [argumentInCall('2')], { returns: ['2'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
			.call('7', '<-', [argumentInCall('5'), argumentInCall('6')], { returns: ['5'], reads: [BuiltIn] })
			.defineFunction('4', ['3'], {
				out:               [],
				in:                [{ nodeId: '2', name: 'x', controlDependencies: [] }],
				unknownReferences: [],
				entryPoint:        '3',
				graph:             new Set(['2', '3']),
				environment:       defaultEnv().pushEnv()
			})
			.constant('6')
			.defineVariable('5', 'x', { definedBy: ['6', '7'] })
		)
	})

	describe('Nested Function Definitions', () => {
		assertDataflow(label('double nested functions', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'normal-definition', 'unnamed-arguments', 'semicolons', 'closures']), shell, 'a <- function() { x <- function(x) { x <- b }; x }; b <- 3; a',  emptyGraph()
			.use('9', 'b', undefined, false)
			.use('14', 'x', undefined, false)
			.reads('14', '3')
			.use('21', 'a')
			.reads('21', '0')
			.call('10', '<-', [argumentInCall('8'), argumentInCall('9')], { returns: ['8'], reads: [BuiltIn], environment: defaultEnv().pushEnv().pushEnv().defineParameter('x', '4', '5') }, false)
			.call('11', '{', [argumentInCall('10')], { returns: ['10'], reads: [BuiltIn], environment: defaultEnv().pushEnv().pushEnv().defineParameter('x', '4', '5') }, false)
			.call('13', '<-', [argumentInCall('3'), argumentInCall('12')], { returns: ['3'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
			.call('15', '{', [argumentInCall('13'), argumentInCall('14')], { returns: ['14'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineFunction('x', '3', '13') }, false)
			.call('17', '<-', [argumentInCall('0'), argumentInCall('16')], { returns: ['0'], reads: [BuiltIn] })
			.call('20', '<-', [argumentInCall('18'), argumentInCall('19')], { returns: ['18'], reads: [BuiltIn], environment: defaultEnv().defineFunction('a', '0', '17') })
			.defineVariable('4', 'x', { definedBy: [] }, false)
			.defineVariable('8', 'x', { definedBy: ['9', '10'] }, false)
			.defineFunction('12', ['11'], {
				out:               [],
				in:                [{ nodeId: '9', name: 'b', controlDependencies: [] }],
				unknownReferences: [],
				entryPoint:        '11',
				graph:             new Set(['4', '9', '8', '10', '11']),
				environment:       defaultEnv().pushEnv().pushEnv().defineVariable('x', '8', '10')
			}, { environment: defaultEnv().pushEnv() }, false)
			.defineVariable('3', 'x', { definedBy: ['12', '13'] }, false)
			.defineFunction('16', ['15'], {
				out:               [],
				in:                [],
				unknownReferences: [],
				entryPoint:        '15',
				graph:             new Set(['12', '3', '13', '14', '15']),
				environment:       defaultEnv().pushEnv().defineFunction('x', '3', '13')
			})
			.defineVariable('0', 'a', { definedBy: ['16', '17'] })
			.constant('19')
			.defineVariable('18', 'b', { definedBy: ['19', '20'] })
		)
		assertDataflow(label('closure w/ default arguments',['name-normal', ...OperatorDatabase['<-'].capabilities, 'formals-default', 'numbers', 'newlines', 'implicit-return', 'normal-definition', 'closures', 'unnamed-arguments']),
			shell, `f <- function(x = 1) {
  function() x
}
g <- f(2)
print(g())`, emptyGraph()
				.use('6', 'x', undefined, false)
				.reads('6', '1')
				.call('9', '{', [argumentInCall('8')], { returns: ['8'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('x', '1', '3') }, false)
				.argument('9', '8')
				.call('11', '<-', [argumentInCall('0'), argumentInCall('10')], { returns: ['0'], reads: [BuiltIn] })
				.argument('11', ['10', '0'])
				.call('16', 'f', [argumentInCall('14')], { returns: ['9'], reads: ['0'], environment: defaultEnv().defineFunction('f', '0', '11') })
				.argument('16', '14')
				.calls('16', '10')
				.argument('17', '16')
				.call('17', '<-', [argumentInCall('12'), argumentInCall('16')], { returns: ['12'], reads: [BuiltIn], environment: defaultEnv().defineFunction('f', '0', '11') })
				.argument('17', '12')
				.call('20', 'g', [], { returns: ['6'], reads: ['12'], environment: defaultEnv().defineFunction('f', '0', '11').defineVariable('g', '12', '17') })
				.calls('20', '8')
				.argument('22', '20')
				.call('22', 'print', [argumentInCall('20')], { returns: ['20'], reads: [BuiltIn], environment: defaultEnv().defineFunction('f', '0', '11').defineVariable('g', '12', '17') })
				.defineVariable('1', 'x', { definedBy: ['2'] }, false)
				.constant('2', undefined, false)
				.defineFunction('8', ['6'], {
					out:               [],
					in:                [],
					unknownReferences: [],
					entryPoint:        '6',
					graph:             new Set(['6']),
					environment:       defaultEnv().pushEnv().pushEnv()
				}, { environment: defaultEnv().pushEnv() }, false)
				.defineFunction('10', ['9'], {
					out:               [],
					in:                [],
					unknownReferences: [],
					entryPoint:        '9',
					graph:             new Set(['1', '2', '8', '9']),
					environment:       defaultEnv().pushEnv().defineParameter('x', '1', '3')
				})
				.defineVariable('0', 'f', { definedBy: ['10', '11'] })
				.constant('14')
				.definesOnCall('14', '1')
				.defineVariable('12', 'g', { definedBy: ['16', '17'] }))
		assertDataflow(label('nested closures w/ default arguments', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'formals-default', 'numbers', 'newlines', 'lambda-syntax', 'implicit-return', ...OperatorDatabase['+'].capabilities, 'closures', 'grouping']),
			shell, `f <- function(x = 1) {
  (\\(y = 2) function(z = 3) x + y + z)()
}
g <- f(8)
print(g())`, emptyGraph()
				.use('14', 'x', undefined, false)
				.reads('14', '1')
				.use('15', 'y', undefined, false)
				.reads('15', '8')
				.use('17', 'z', undefined, false)
				.reads('17', '11')
				.argument('16', '14')
				.argument('16', '15')
				.call('16', '+', [argumentInCall('14'), argumentInCall('15')], { returns: [], reads: [BuiltIn, '14', '15'], onlyBuiltIn: true, environment: defaultEnv().pushEnv().pushEnv().pushEnv().defineParameter('z', '11', '13') }, false)
				.argument('18', '16')
				.argument('18', '17')
				.call('18', '+', [argumentInCall('16'), argumentInCall('17')], { returns: [], reads: ['16', '17', BuiltIn], onlyBuiltIn: true, environment: defaultEnv().pushEnv().pushEnv().pushEnv().defineParameter('z', '11', '13') }, false)
				.call('23', '(', [argumentInCall('22')], { returns: ['22'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('x', '1', '3') }, false)
				.argument('23', '22')
				.call('24', `${UnnamedFunctionCallPrefix}24`, [], { returns: ['20'], reads: ['23'], environment: defaultEnv().pushEnv().defineParameter('x', '1', '3') }, false)
				.calls('24', ['23', '22'])
				.argument('25', '24')
				.call('25', '{', [argumentInCall('24')], { returns: ['24'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('x', '1', '3') }, false)
				.call('27', '<-', [argumentInCall('0'), argumentInCall('26')], { returns: ['0'], reads: [BuiltIn] })
				.argument('27', ['26', '0'])
				.call('32', 'f', [argumentInCall('30')], { returns: ['25'], reads: ['0'], environment: defaultEnv().defineFunction('f', '0', '27') })
				.argument('32', '30')
				.calls('32', '26')
				.argument('33', '32')
				.call('33', '<-', [argumentInCall('28'), argumentInCall('32')], { returns: ['28'], reads: [BuiltIn], environment: defaultEnv().defineFunction('f', '0', '27') })
				.argument('33', '28')
				.call('36', 'g', [], { returns: ['18'], reads: ['28'], environment: defaultEnv().defineFunction('f', '0', '27').defineVariable('g', '28', '33') })
				.calls('36', '20')
				.argument('38', '36')
				.call('38', 'print', [argumentInCall('36')], { returns: ['36'], reads: [BuiltIn], environment: defaultEnv().defineFunction('f', '0', '27').defineVariable('g', '28', '33') })
				.defineVariable('1', 'x', { definedBy: ['2'] }, false)
				.constant('2', undefined, false)
				.defineVariable('8', 'y', { definedBy: ['9'] }, false)
				.constant('9', undefined, false)
				.defineVariable('11', 'z', { definedBy: ['12'] }, false)
				.constant('12', undefined, false)
				.defineFunction('20', ['18'], {
					out:               [],
					in:                [],
					unknownReferences: [],
					entryPoint:        '18',
					graph:             new Set(['11', '12', '14', '15', '16', '17', '18']),
					environment:       defaultEnv().pushEnv().pushEnv().pushEnv().defineParameter('z', '11', '13')
				}, { environment: defaultEnv().pushEnv().pushEnv() }, false)
				.defineFunction('22', ['20'], {
					out:               [],
					in:                [],
					unknownReferences: [],
					entryPoint:        '20',
					graph:             new Set(['8', '9', '20']),
					environment:       defaultEnv().pushEnv().pushEnv().defineParameter('y', '8', '10')
				}, { environment: defaultEnv().pushEnv() }, false)
				.defineFunction('26', ['25'], {
					out:               [],
					in:                [{ nodeId: '24', name: `${UnnamedFunctionCallPrefix}24`, controlDependencies: [] }],
					unknownReferences: [],
					entryPoint:        '25',
					graph:             new Set(['1', '2', '22', '23', '24', '25']),
					environment:       defaultEnv().pushEnv().defineParameter('x', '1', '3')
				})
				.defineVariable('0', 'f', { definedBy: ['26', '27'] })
				.constant('30')
				.definesOnCall('30', '1')
				.defineVariable('28', 'g', { definedBy: ['32', '33'] }), { minRVersion: MIN_VERSION_LAMBDA })
		assertDataflow(label('closure w/ side effects', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'normal-definition', 'newlines', 'closures', ...OperatorDatabase['<<-'].capabilities, 'side-effects-in-function-call', ...OperatorDatabase['+'].capabilities, 'numbers']),
			shell, `f <- function() {
  function() {
    x <<- x + 1
    x
  }
}
x <- 2
f()()
print(x)`, emptyGraph()
				.use('6', 'x', undefined, false)
				.use('10', 'x', undefined, false)
				.reads('10', '5')
				.use('23', 'x')
				.reads('23', '5')
				.argument('8', '6')
				.call('8', '+', [argumentInCall('6'), argumentInCall('7')], { returns: [], reads: [BuiltIn, '6', '7'], onlyBuiltIn: true, environment: defaultEnv().pushEnv().pushEnv() }, false)
				.argument('8', '7')
				.argument('9', '8')
				.call('9', '<<-', [argumentInCall('5'), argumentInCall('8')], { returns: ['5'], reads: [BuiltIn], environment: defaultEnv().pushEnv().pushEnv() }, false)
				.argument('9', '5')
				.argument('11', '9')
				.argument('11', '10')
				.call('11', '{', [argumentInCall('9'), argumentInCall('10')], { returns: ['10'], reads: [BuiltIn], environment: defaultEnv().defineVariable('x', '5', '9').pushEnv().pushEnv() }, false)
				.call('13', '{', [argumentInCall('12')], { returns: ['12'], reads: [BuiltIn], environment: defaultEnv().pushEnv() }, false)
				.argument('13', '12')
				.call('15', '<-', [argumentInCall('0'), argumentInCall('14')], { returns: ['0'], reads: [BuiltIn] })
				.argument('15', ['14', '0'])
				.call('18', '<-', [argumentInCall('16'), argumentInCall('17')], { returns: ['16'], reads: [BuiltIn], environment: defaultEnv().defineFunction('f', '0', '15') })
				.argument('18', ['17', '16'])
				.call('20', 'f', [], { returns: ['13'], reads: ['0'], environment: defaultEnv().defineFunction('f', '0', '15').defineVariable('x', '16', '18') })
				.calls('20', '14')
				.call('21', `${UnnamedFunctionCallPrefix}21`, [], { returns: ['11'], reads: ['20', '16'], environment: defaultEnv().defineFunction('f', '0', '15').defineVariable('x', '16', '18') })
				.calls('21', ['20', '12'])
				.argument('25', '23')
				.call('25', 'print', [argumentInCall('23')], { returns: ['23'], reads: [BuiltIn], environment: defaultEnv().defineFunction('f', '0', '15').defineVariable('x', '5', '9') })
				.constant('7', undefined, false)
				.defineVariable('5', 'x', { definedBy: ['8', '9'] }, false)
				.sideEffectOnCall('5', '21')
				.defineFunction('12', ['11'], {
					out:               [],
					in:                [{ nodeId: '6', name: 'x', controlDependencies: [] }],
					unknownReferences: [],
					entryPoint:        '11',
					graph:             new Set(['6', '7', '8', '5', '9', '10', '11']),
					environment:       defaultEnv().defineVariable('x', '5', '9').pushEnv().pushEnv()
				}, { environment: defaultEnv().defineVariable('x', '5', '9').pushEnv() }, false)
				.defineFunction('14', ['13'], {
					out:               [],
					in:                [],
					unknownReferences: [],
					entryPoint:        '13',
					graph:             new Set(['12', '13']),
					environment:       defaultEnv().pushEnv()
				})
				.defineVariable('0', 'f', { definedBy: ['14', '15'] })
				.constant('17')
				.defineVariable('16', 'x', { definedBy: ['17', '18'] }))
	})

	describe('Dead Code', () => {
		assertDataflow(label('simple return', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'formals-named', 'newlines', 'numbers', ...OperatorDatabase['*'].capabilities, 'return', 'unnamed-arguments']),
			shell, `f <- function(x) {
   x <- 3 * x
   return(x)
   x <- 2
   return(x)
}

f(5)`, emptyGraph()
				.use('7', 'x', undefined, false)
				.reads('7', '1')
				.use('11', 'x', undefined, false)
				.reads('11', '5')
				.argument('8', '7')
				.call('8', '*', [argumentInCall('6'), argumentInCall('7')], { returns: [], reads: [BuiltIn, '6', '7'], onlyBuiltIn: true, environment: defaultEnv().pushEnv().defineParameter('x', '1', '2') }, false)
				.argument('8', '6')
				.argument('9', '8')
				.call('9', '<-', [argumentInCall('5'), argumentInCall('8')], { returns: ['5'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('x', '1', '2') }, false)
				.argument('9', '5')
				.argument('13', '11')
				.call('13', 'return', [argumentInCall('11')], { returns: ['11'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineVariable('x', '5', '9') }, false)
				.argument('21', '9')
				.argument('21', '13')
				.call('21', '{', [argumentInCall('9'), argumentInCall('13')], { returns: ['13'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineVariable('x', '5', '9') }, false)
				.call('23', '<-', [argumentInCall('0'), argumentInCall('22')], { returns: ['0'], reads: [BuiltIn] })
				.argument('23', ['22', '0'])
				.call('27', 'f', [argumentInCall('25')], { returns: ['21'], reads: ['0'], environment: defaultEnv().defineFunction('f', '0', '23') })
				.argument('27', '25')
				.calls('27', '22')
				.defineVariable('1', 'x', { definedBy: [] }, false)
				.constant('6', undefined, false)
				.defineVariable('5', 'x', { definedBy: ['8', '9'] }, false)
				.defineFunction('22', ['21'], {
					out:               [],
					in:                [],
					unknownReferences: [],
					entryPoint:        '21',
					graph:             new Set(['1', '6', '7', '8', '5', '9', '11', '13', '21']),
					environment:       defaultEnv().pushEnv().defineVariable('x', '5', '9')
				})
				.defineVariable('0', 'f', { definedBy: ['22', '23'] })
				.constant('25')
				.definesOnCall('25', '1'))
		assertDataflow(label('return in if',['name-normal', ...OperatorDatabase['<-'].capabilities, 'formals-named', 'newlines', 'numbers', ...OperatorDatabase['*'].capabilities, 'return', 'unnamed-arguments', 'if']),
			shell, `f <- function(x) {
   x <- 3 * x
   if(k)
      return(x)
   else
      return(1)
   x <- 2
   return(x)
}

f(5)`, emptyGraph()
				.use('7', 'x', undefined, false)
				.reads('7', '1')
				.use('10', 'k', undefined, false)
				.use('12', 'x', undefined, false)
				.reads('12', '5')
				.argument('8', '7')
				.call('8', '*', [argumentInCall('6'), argumentInCall('7')], { returns: [], reads: [BuiltIn, '6', '7'], onlyBuiltIn: true, environment: defaultEnv().pushEnv().defineParameter('x', '1', '2') }, false)
				.argument('8', '6')
				.argument('9', '8')
				.call('9', '<-', [argumentInCall('5'), argumentInCall('8')], { returns: ['5'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('x', '1', '2') }, false)
				.argument('9', '5')
				.argument('14', '12')
				.call('14', 'return', [argumentInCall('12')], { returns: ['12'], reads: [BuiltIn], controlDependencies: [{ id: '21', when: true }], environment: defaultEnv().pushEnv().defineVariable('x', '5', '9') }, false)
				.call('19', 'return', [argumentInCall('17')], { returns: ['17'], reads: [BuiltIn], controlDependencies: [{ id: '21', when: false }], environment: defaultEnv().pushEnv().defineVariable('x', '5', '9') }, false)
				.argument('19', '17')
				.argument('21', '10')
				.argument('21', '14')
				.argument('21', '19')
				.call('21', 'if', [argumentInCall('10'), argumentInCall('14', { controlDependencies: [{ id: '21', when: true }] }), argumentInCall('19', { controlDependencies: [{ id: '21', when: false }] })], { returns: ['14', '19'], reads: ['10', BuiltIn], onlyBuiltIn: true, environment: defaultEnv().pushEnv().defineVariable('x', '5', '9') }, false)
				.argument('29', '9')
				.argument('29', '21')
				.call('29', '{', [argumentInCall('9'), argumentInCall('21')], { returns: ['14', '19'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineVariable('x', '5', '9') }, false)
				.call('31', '<-', [argumentInCall('0'), argumentInCall('30')], { returns: ['0'], reads: [BuiltIn] })
				.argument('31', ['30', '0'])
				.call('35', 'f', [argumentInCall('33')], { returns: ['29'], reads: ['0'], environment: defaultEnv().defineFunction('f', '0', '31') })
				.argument('35', '33')
				.calls('35', '30')
				.defineVariable('1', 'x', { definedBy: [] }, false)
				.constant('6', undefined, false)
				.defineVariable('5', 'x', { definedBy: ['8', '9'] }, false)
				.constant('17', undefined, false)
				.defineFunction('30', ['29'], {
					out:               [],
					in:                [{ nodeId: '10', name: 'k', controlDependencies: [] }],
					unknownReferences: [],
					entryPoint:        '29',
					graph:             new Set(['1', '6', '7', '8', '5', '9', '10', '12', '14', '17', '19', '21', '29']),
					environment:       defaultEnv().pushEnv().defineVariable('x', '5', '9')
				})
				.defineVariable('0', 'f', { definedBy: ['30', '31'] })
				.constant('33')
				.definesOnCall('33', '1'))
	})

	describe('Side Effects', () => {
		assertDataflow(label('global definition', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'formals-named', 'numbers', 'implicit-return', ...OperatorDatabase['*'].capabilities, ...OperatorDatabase['<<-'].capabilities, 'lambda-syntax', 'unnamed-arguments', ...OperatorDatabase['+'].capabilities, 'side-effects-in-function-call']),
			shell, `f <- function(x) 2 * x

m <- function(g) {
   f <<- g
}

m(\\(x) x + 1)

f(3)`, emptyGraph()
				.use('4', 'x', undefined, false)
				.reads('4', '1')
				.use('15', 'g', undefined, false)
				.reads('15', '10')
				.use('23', 'x', undefined, false)
				.reads('23', '21')
				.argument('5', '4')
				.call('5', '*', [argumentInCall('3'), argumentInCall('4')], { returns: [], reads: ['3', '4', BuiltIn], onlyBuiltIn: true, environment: defaultEnv().pushEnv().defineParameter('x', '1', '2') }, false)
				.argument('5', '3')
				.call('8', '<-', [argumentInCall('0'), argumentInCall('7')], { returns: ['0'], reads: [BuiltIn] })
				.argument('8', ['7', '0'])
				.argument('16', '15')
				.call('16', '<<-', [argumentInCall('14'), argumentInCall('15')], { returns: ['14'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('g', '10', '11') }, false)
				.argument('16', '14')
				.argument('17', '16')
				.call('17', '{', [argumentInCall('16')], { returns: ['16'], reads: [BuiltIn], environment: defaultEnv().pushEnv().defineParameter('g', '10', '11') }, false)
				.call('19', '<-', [argumentInCall('9'), argumentInCall('18')], { returns: ['9'], reads: [BuiltIn], environment: defaultEnv().defineFunction('f', '0', '8') })
				.argument('19', ['18', '9'])
				.argument('25', '23')
				.call('25', '+', [argumentInCall('23'), argumentInCall('24')], { returns: [], reads: ['23', '24', BuiltIn], onlyBuiltIn: true, environment: defaultEnv().pushEnv().defineParameter('x', '21', '22') }, false)
				.argument('25', '24')
				.call('29', 'm', [argumentInCall('27')], { returns: ['17'], reads: ['9'], environment: defaultEnv().defineFunction('f', '0', '8').defineFunction('m', '9', '19') })
				.argument('29', '27')
				.calls('29', '18')
				.call('33', 'f', [argumentInCall('31')], { returns: ['25'], reads: ['14'], environment: defaultEnv().defineVariable('f', '14', '16').defineFunction('m', '9', '19') })
				.argument('33', '31')
				.calls('33', '27')
				.defineVariable('1', 'x', { definedBy: [] }, false)
				.constant('3', undefined, false)
				.defineFunction('7', ['5'], {
					out:               [],
					in:                [],
					unknownReferences: [],
					entryPoint:        '5',
					graph:             new Set(['1', '3', '4', '5']),
					environment:       defaultEnv().pushEnv().defineParameter('x', '1', '2')
				})
				.defineVariable('0', 'f', { definedBy: ['7', '8'] })
				.defineVariable('10', 'g', { definedBy: [] }, false)
				.defineVariable('14', 'f', { definedBy: ['15', '16'] }, false)
				.sideEffectOnCall('14', '29')
				.defineFunction('18', ['17'], {
					out:               [],
					in:                [],
					unknownReferences: [],
					entryPoint:        '17',
					graph:             new Set(['10', '15', '14', '16', '17']),
					environment:       defaultEnv().defineVariable('f', '14', '16').pushEnv().defineParameter('g', '10', '11')
				}, { environment: defaultEnv().defineVariable('f', '14', '16') })
				.defineVariable('9', 'm', { definedBy: ['18', '19'] })
				.defineVariable('21', 'x', { definedBy: [] }, false)
				.constant('24', undefined, false)
				.defineFunction('27', ['25'], {
					out:               [],
					in:                [],
					unknownReferences: [],
					entryPoint:        '25',
					graph:             new Set(['21', '23', '24', '25']),
					environment:       defaultEnv().pushEnv().defineParameter('x', '21', '22')
				})
				.definesOnCall('27', '10')
				.constant('31')
				.definesOnCall('31', '21'), { minRVersion: MIN_VERSION_LAMBDA })
	})
}))
