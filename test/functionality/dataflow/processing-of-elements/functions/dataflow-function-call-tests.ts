import { assertDataflow, withShell } from '../../../_helper/shell'
import { MIN_VERSION_LAMBDA } from '../../../../../src/r-bridge/lang-4.x/ast/model/versions'
import { emptyGraph } from '../../../_helper/dataflow/dataflowgraph-builder'
import { argumentInCall, defaultEnv, unnamedArgument } from '../../../_helper/dataflow/environment-builder'
import {
	UnnamedFunctionCallPrefix
} from '../../../../../src/dataflow/internal/process/functions/call/unnamed-call-handling'
import { EmptyArgument } from '../../../../../src'

describe('Function Call', withShell(shell => {
	describe('Calling previously defined functions', () => {
		const envWithXParamDefined = defaultEnv().pushEnv().defineParameter('x', '4', '5')
		const envWithFirstI = defaultEnv().defineVariable('i', '0', '2')
		const envWithIA = envWithFirstI.defineFunction('a', '3', '9')

		assertDataflow('Calling function a', shell, 'i <- 4; a <- function(x) { x }\na(i)',
			emptyGraph()
				.defineVariable('0', 'i')
				.defineVariable('3', 'a')
				.use('11', 'i')
				.use('12', unnamedArgument('12'))
				.call('13', 'a', [argumentInCall('12')], { environment: envWithIA })
				.defineFunction('8', '8', ['6'], {
					out:               [],
					in:                [],
					unknownReferences: [],
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '8',
					environment:       envWithXParamDefined,
					graph:             new Set(['4', '6']),
				}, { environment: envWithXParamDefined.popEnv() })
				.defineVariable('4', 'x', { },  false)
				.use('6', 'x', { }, false)
				.reads('6', '4')
				.reads('11', '0')
				.definedBy('3', '8')
				.argument('13', '12')
				.reads('12', '11')
				.reads('13', '3')
				.calls('13', '8')
				.returns('13', '6')
				.definesOnCall('12', '4')
		)
		const envWithIAB = envWithIA.defineVariable('b', '10', '12')
		assertDataflow('Calling function a with an indirection', shell, 'i <- 4; a <- function(x) { x }\nb <- a\nb(i)',
			emptyGraph()
				.defineVariable('0', 'i')
				.defineVariable('3', 'a')
				.defineVariable('10', 'b')
				.use('11', 'a')
				.use('14', 'i')
				.use('15', unnamedArgument('15'))
				.call('16', 'b', [argumentInCall('15')], { environment: envWithIAB })
				.defineFunction('8', '8', ['6'], {
					out:               [],
					in:                [],
					unknownReferences: [],
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '8',
					environment:       envWithXParamDefined,
					graph:             new Set(['4', '6'])
				},
				{ environment: envWithXParamDefined.popEnv() })
				.defineVariable('4', 'x', { },  false)
				.use('6', 'x', { }, false)
				.reads('6', '4')
				.reads('14', '0')
				.definedBy('3', '8')
				.definedBy('10', '11')
				.reads('11', '3')
				.argument('16', '15')
				.reads('15', '14')
				.reads('16', '10')
				.calls('16', '8')
				.returns('16', '6')
				.definesOnCall('15', '4')
		)
		const envWithLastXDefined = defaultEnv().pushEnv().defineVariable('x', '9', '11')
		const envWithIAndLargeA = envWithFirstI.defineFunction('a', '3', '15')

		assertDataflow('Calling with a constant function', shell, `i <- 4
a <- function(x) { x <- x; x <- 3; 1 }
a(i)`, emptyGraph()
			.defineVariable('0', 'i')
			.defineVariable('3', 'a')
			.use('17', 'i')
			.use('18', unnamedArgument('18'))
			.reads('17', '0')
			.call('19', 'a', [argumentInCall('18')], { environment: envWithIAndLargeA })
			.defineFunction('14', '14', ['12'], {
				out:               [],
				in:                [],
				unknownReferences: [],
				breaks:            [],
				nexts:             [],
				returns:           [],
				entryPoint:        '14',
				environment:       envWithLastXDefined,
				graph:             new Set(['4', '6', '7', '9'])
			},
			{ environment: defaultEnv() }
			)
			.defineVariable('4', 'x', { },  false)
			.defineVariable('6', 'x', { },  false)
			.defineVariable('9', 'x', { },  false)
			.use('7', 'x', { }, false)
			.exit('12', '1', { environment: envWithLastXDefined }, false)
			.definedBy('6', '7')
			.reads('7', '4')
			.sameDef('6', '9')
			.sameDef('4', '9')
			.sameDef('4', '6')

			.definedBy('3', '14')
			.argument('19', '18')
			.reads('18', '17')
			.reads('19', '3')
			.calls('19', '14')
			.returns('19', '12')
			.definesOnCall('18', '4')
		)
	})

	describe('Directly calling a function', () => {
		const envWithXParameter = defaultEnv().pushEnv().defineParameter('x', '0', '1')
		const outGraph = emptyGraph()
			.call('9', `${UnnamedFunctionCallPrefix}9`,[argumentInCall('8')])
			.defineFunction('6', '6', ['4'], {
				out:               [],
				in:                [],
				unknownReferences: [],
				breaks:            [],
				nexts:             [],
				returns:           [],
				entryPoint:        '6',
				environment:       envWithXParameter,
				graph:             new Set(['0', '2'])
			},
			{ environment: defaultEnv() })
			.defineVariable('0', 'x', { },  false)
			.use('2', 'x', { }, false)
			.exit('4', '+', { environment: envWithXParameter }, false)
			.relates('2', '4')
			.reads('2', '0')

			.use('8', unnamedArgument('8'))
			.argument('9', '8')
			.calls('9', '6')
			.returns('9', '4')
			.definesOnCall('8', '0')

		assertDataflow('Calling with constant argument using lambda', shell, '(\\(x) { x + 1 })(2)',
			outGraph,
			{ minRVersion: MIN_VERSION_LAMBDA }
		)
		assertDataflow('Calling with constant argument', shell, '(function(x) { x + 1 })(2)',
			outGraph
		)

		const envWithADefined = defaultEnv().defineFunction('a', '0', '6')

		assertDataflow('Calling a function which returns another', shell, `a <- function() { function() { 42 } }
a()()`,
		emptyGraph()
			.call('9', `${UnnamedFunctionCallPrefix}9`, [], { environment: envWithADefined })
			.call('8', 'a', [], { environment: envWithADefined })
			.defineVariable('0', 'a')
			.defineFunction('5', '5', ['3'], {
				out:               [],
				in:                [],
				unknownReferences: [],
				breaks:            [],
				nexts:             [],
				returns:           [],
				entryPoint:        '5',
				environment:       defaultEnv().pushEnv(),
				graph:             new Set(['3'])
			},
			{ environment: defaultEnv() }
			)
			.defineFunction('3', '3', ['1'], {
				out:               [],
				in:                [],
				unknownReferences: [],
				breaks:            [],
				nexts:             [],
				returns:           [],
				entryPoint:        '3',
				environment:       defaultEnv().pushEnv().pushEnv(),
				graph:             new Set()
			},
			{ environment: defaultEnv().pushEnv() }, false)
			.exit('1', '42', { environment: defaultEnv().pushEnv().pushEnv() }, false)
			.calls('9', '8')
			.reads('8', '0')
			.definedBy('0', '5')
			.calls('8', '5')
			.returns('8', '3')
			.calls('9', '3')
			.returns('9', '1')
		)
	})

	describe('Argument which is expression', () => {
		assertDataflow('Calling with 1 + x', shell, 'foo(1 + x)',
			emptyGraph()
				.call('5', 'foo', [argumentInCall('4')], { environment: defaultEnv() })
				.use('4', unnamedArgument('4'))
				.use('2', 'x')
				.reads('4', '2')
				.argument('5', '4')
		)
	})

	describe('Argument which is anonymous function call', () => {
		assertDataflow('Calling with a constant function', shell, 'f(function() { 3 })',
			emptyGraph()
				.call('5', 'f', [argumentInCall('4')], { environment: defaultEnv() })
				.use('4', unnamedArgument('4'))
				.defineFunction('3', '3', ['1'], {
					out:               [],
					in:                [],
					unknownReferences: [],
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '3',
					environment:       defaultEnv().pushEnv(),
					graph:             new Set()
				})
				.exit('1', '3', { environment: defaultEnv().pushEnv() }, false)
				.reads('4', '3')
				.argument('5', '4')
		)
	})

	describe('Multiple out refs in arguments', () => {
		assertDataflow('Calling \'seq\'', shell, 'seq(1, length(pkgnames), by = stepsize)',
			emptyGraph()
				.call('11', 'seq', [argumentInCall('2'), argumentInCall('7'), argumentInCall('10', { name: 'by' })],{ environment: defaultEnv() })
				.use('2', unnamedArgument('2'))
				.use('7', unnamedArgument('7'))
				.use('10', 'by')
				.argument('11', '2')
				.argument('11', '7')
				.argument('11', '10')
				.use('9', 'stepsize' )
				.reads('10', '9')
				.call('6', 'length', [argumentInCall('5')], { environment: defaultEnv() })
				.reads('7', '6')
				.use('5', unnamedArgument('5'))
				.argument('6', '5')
				.use('4', 'pkgnames' )
				.reads('5', '4')

		)
	})

	describe('Late function bindings', () => {
		const innerEnv = defaultEnv().pushEnv()
		const defWithA = defaultEnv().defineFunction('a', '0', '4')
		const defWithAY = defWithA.defineVariable('y', '5', '7')

		assertDataflow('Late binding of y', shell, 'a <- function() { y }\ny <- 12\na()',
			emptyGraph()
				.defineVariable('0', 'a')
				.defineVariable('5', 'y')
				.call('9', 'a', [], { environment: defWithAY })
				.defineFunction('3', '3', ['1'], {
					out:               [],
					in:                [{ nodeId: '1', name: 'y', controlDependency: undefined }],
					unknownReferences: [],
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '3',
					environment:       innerEnv,
					graph:             new Set(['1'])
				})
				.use('1', 'y', { }, false)
				.definedBy('0', '3')
				.calls('9', '3')
				.reads('9', '0')
				.returns('9', '1')
				.reads('9', '5')
		)
	})

	describe('Deal with empty calls', () => {
		const withXParameter = defaultEnv()
			.pushEnv().defineParameter('x', '1', '3')
		const withXYParameter = withXParameter.defineParameter('y', '4', '5')
		const withADefined = defaultEnv().defineFunction('a', '0', '9')

		assertDataflow('Not giving first parameter', shell, `a <- function(x=3,y) { y }
a(,3)`, emptyGraph()
			.call('13', 'a', [
				EmptyArgument,
				{ nodeId: '12', name: unnamedArgument('12'), controlDependency: undefined }
			],
			{ environment: withADefined })
			.defineVariable('0', 'a')
			.defineFunction('8', '8', ['6'], {
				out:               [],
				in:                [],
				unknownReferences: [],
				breaks:            [],
				nexts:             [],
				returns:           [],
				entryPoint:        '8',
				environment:       withXYParameter,
				graph:             new Set(['1', '4', '6'])
			},
			{ environment: withXYParameter.popEnv() })
			.defineVariable('1', 'x', { },false)
			.defineVariable('4', 'y', { },false)
			.use('6', 'y', { }, false)
			.reads('6', '4')
			.use('12', unnamedArgument('12'))
			.reads('13', '0')
			.calls('13', '8')
			.definedBy('0', '8')
			.argument('13', '12')
			.returns('13', '6')
			.definesOnCall('12', '4')
		)
	})
	describe('Reuse parameters in call', () => {
		assertDataflow('Not giving first argument', shell, 'a(x=3, x)', emptyGraph()
			.call('6', 'a', [argumentInCall('3', { name: 'x' }), argumentInCall('5')])
			.use('3', 'x')
			.use('5', unnamedArgument('5'))
			.use('4', 'x')
			.argument('6', '3')
			.argument('6', '5')
			.reads('5', '4')
			.reads('4', '3')
		)
	})
	describe('Define in parameters', () => {
		assertDataflow('Support assignments in function calls', shell, 'foo(x <- 3); x', emptyGraph()
			.call('5', 'foo', [argumentInCall('4')])
			.use('4', unnamedArgument('4'))
			.defineVariable('1', 'x')
			.use('6', 'x')
			.argument('5', '4')
			.reads('4', '1')
			.reads('6', '1')
		)
	})
}))
