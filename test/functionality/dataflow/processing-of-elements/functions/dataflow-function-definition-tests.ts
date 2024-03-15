import { assertDataflow, withShell } from '../../../_helper/shell'
import { BuiltIn } from '../../../../../src/dataflow'
import { emptyGraph } from '../../../_helper/dataflow/dataflowgraph-builder'
import { argumentInCall, defaultEnv, unnamedArgument } from '../../../_helper/dataflow/environment-builder'

describe('Function Definition', withShell(shell => {
	describe('Only functions', () => {
		assertDataflow('unknown read in function', shell, 'function() { x }',
			emptyGraph()
				.defineFunction('2', '2', ['0'], {
					out:               [],
					unknownReferences: [],
					in:                [{ nodeId: '0', name: 'x', controlDependency: undefined }],
					graph:             new Set(['0']),
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '2',
					environment:       defaultEnv().pushEnv()
				})
				.use('0', 'x', { }, false)
		)

		const envWithXDefined = defaultEnv().pushEnv().defineParameter('x', '0', '1')
		assertDataflow('read of parameter', shell, 'function(x) { x }',
			emptyGraph()
				.defineFunction('4', '4', ['2'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					graph:             new Set(['0', '2']),
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '4',
					environment:       envWithXDefined
				})
				.defineVariable('0', 'x', { },  false)
				.use('2', 'x', { }, false)
				.reads('2', '0')
		)
		assertDataflow('read of parameter in return', shell, 'function(x) { return(x) }',
			emptyGraph()
				.defineFunction('7', '7', ['5'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					graph:             new Set(['4', '5', '3', '0']),
					breaks:            [],
					nexts:             [],
					returns:           ['5'],
					entryPoint:        '7',
					environment:       envWithXDefined
				})
				.defineVariable('0', 'x', { },  false)
				.use('3', 'x', { }, false)
				.call('5', 'return', [argumentInCall('4')], { environment: envWithXDefined }, false)
				.use('4',unnamedArgument('4'), { }, false)
				.reads('5', BuiltIn)
				.calls('5', BuiltIn)
				.reads('3', '0')
				.argument('5', '4')
				.returns('5', '4')
				.reads('4', '3')
		)

		describe('x', () => {
			assertDataflow('return parameter named', shell, 'function(x) { return(x=x) }',
				emptyGraph()
					.defineFunction('8', '8', ['6'], {
						out:               [],
						unknownReferences: [],
						in:                [],
						graph:             new Set(['5', '6', '4', '0']),
						breaks:            [],
						nexts:             [],
						returns:           ['6'],
						entryPoint:        '8',
						environment:       envWithXDefined
					})
					.defineVariable('0', 'x', { },  false)
					.use('4', 'x', { }, false)
					.call('6', 'return', [argumentInCall('5', { name: 'x' })], { environment: envWithXDefined }, false)
					.use('5', 'x', { }, false)
					.reads('6', BuiltIn)
					.calls('6', BuiltIn)
					.reads('4', '0')
					.argument('6', '5')
					.returns('6', '5')
					.reads('5', '4')
			)
		})

		const envWithoutParams = defaultEnv().pushEnv()
		const envWithXParam = envWithoutParams.defineParameter('x', '0', '1')
		const envWithXYParam = envWithXParam.defineParameter('y', '2', '3')
		const envWithXYZParam = envWithXYParam.defineParameter('z', '4', '5')

		assertDataflow('read of one parameter', shell, 'function(x,y,z) y',
			emptyGraph()
				.defineFunction('8', '8', ['6'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					breaks:            [],
					nexts:             [],
					returns:           [],
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
		assertDataflow('previously defined read in function', shell, 'x <- 3; function() { x }',
			emptyGraph()
				.defineVariable('0', 'x')
				.defineFunction('5', '5', ['3'], {
					out:               [],
					unknownReferences: [],
					in:                [ { nodeId: '3', name: 'x', controlDependency: undefined } ],
					graph:             new Set(['3']),
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '5',
					environment:       defaultEnv().pushEnv()
				})
				.use('3', 'x', { }, false)
		)
		const envWithXDefined = defaultEnv().pushEnv().defineVariable('x', '0', '2')
		assertDataflow('local define with <- in function, read after', shell, 'function() { x <- 3; }; x',
			emptyGraph()
				.use('5', 'x')
				.defineFunction('4', '4', ['2' /* the assignment */], {
					out:               [],
					unknownReferences: [],
					in:                [],
					graph:             new Set(['0']),
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '4',
					environment:       envWithXDefined
				})
				.defineVariable('0', 'x', { },  false)
				.exit('2', '<-', { environment: envWithXDefined }, false)
				.relates('2', '0')
		)
		assertDataflow('local define with = in function, read after', shell, 'function() { x = 3; }; x',
			emptyGraph()
				.use('5', 'x')
				.defineFunction('4', '4', ['2'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					graph:             new Set(['0']),
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '4',
					environment:       envWithXDefined
				})
				.defineVariable('0', 'x', { },  false)
				.exit('2', '=', { environment: envWithXDefined }, false)
				.relates('2', '0')
		)

		const envWithXDefinedR = defaultEnv().pushEnv().defineVariable('x', '1', '2')
		assertDataflow('local define with -> in function, read after', shell, 'function() { 3 -> x; }; x',
			emptyGraph()
				.use('5', 'x')
				.defineFunction('4', '4', ['2'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '4',
					graph:             new Set(['1']),
					environment:       envWithXDefinedR
				})
				.defineVariable('1', 'x', { },  false)
				.exit('2', '->', { environment: envWithXDefinedR }, false)
				.relates('2', '1')
		)
		const envWithXDefinedGlobal = defaultEnv().pushEnv().defineVariable('x', '0', '2')
		assertDataflow('global define with <<- in function, read after', shell, 'function() { x <<- 3; }; x',
			emptyGraph()
				.use('5', 'x')
				.defineFunction('4', '4', ['2'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '4',
					graph:             new Set(['0']),
					environment:       envWithXDefinedGlobal
				},
				{ environment: envWithXDefinedGlobal.popEnv() }
				)
				.defineVariable('0', 'x')
				.exit('2', '<<-', { environment: envWithXDefinedGlobal }, false)
				.relates('2', '0')
		)
		const envWithXDefinedGlobalR = defaultEnv().pushEnv().defineVariable('x', '1', '2')
		assertDataflow('global define with ->> in function, read after', shell, 'function() { 3 ->> x; }; x',
			emptyGraph()
				.use('5', 'x')
				.defineFunction('4', '4', ['2'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '4',
					graph:             new Set(['1']),
					environment:       envWithXDefinedGlobalR
				},
				{ environment: envWithXDefinedGlobalR.popEnv() }
				)
				.defineVariable('1', 'x', { },  false)
				.exit('2', '->>', { environment: envWithXDefinedGlobalR }, false)
				.relates('2', '1')
		)
		const envDefXSingle = defaultEnv().pushEnv().defineVariable('x', '3', '5')
		assertDataflow('shadow in body', shell, 'x <- 2; function() { x <- 3; x }; x',
			emptyGraph()
				.defineVariable('0', 'x')
				.use('9', 'x')
				.reads('9', '0')
				.defineFunction('8', '8', ['6'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '8',
					graph:             new Set(['6', '3']),
					environment:       envDefXSingle
				})
				.use('6', 'x', {},  false)
				.defineVariable('3', 'x', { },  false)
				.reads('6', '3')
		)
		assertDataflow('shadow in body with closure', shell, 'x <- 2; function() { x <- x; x }; x',
			emptyGraph()
				.defineVariable('0', 'x')
				.use('9', 'x')
				.reads('9', '0')
				.defineFunction('8', '8', ['6'], {
					out:               [],
					unknownReferences: [],
					in:                [ { nodeId: '4', name: 'x', controlDependency: undefined } ],
					graph:             new Set(['3', '4', '6']),
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '8',
					environment:       envDefXSingle
				})
				.defineVariable('3', 'x', {  },  false)
				.use('4', 'x', { }, false)
				.use('6', 'x', { }, false)
				.reads('6', '3')
				.definedBy('3', '4')
		)
	})
	describe('Scoping of parameters', () => {
		const envWithXDefined = defaultEnv().pushEnv().defineParameter('x', '3', '4')
		assertDataflow('parameter shadows', shell, 'x <- 3; function(x) { x }',
			emptyGraph()
				.defineVariable('0', 'x')
				.defineFunction('7', '7', ['5'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					graph:             new Set(['3', '5']),
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '7',
					environment:       envWithXDefined
				})
				.defineVariable('3', 'x', { },  false)
				.use('5', 'x', { }, false)
				.reads('5', '3')
		)
	})
	describe('Access dot-dot-dot', () => {
		const envWithParam = defaultEnv().pushEnv().defineParameter('...', '0', '1')
		assertDataflow('parameter shadows', shell, 'function(...) { ..11 }',
			emptyGraph()
				.defineFunction('4', '4', ['2'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					graph:             new Set(['0', '2']),
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '4',
					environment:       envWithParam
				})
				.defineVariable('0', '...', { },  false)
				.use('2', '..11', { }, false)
				.reads('2', '0')
		)
	})
	describe('Using named arguments', () => {
		const envWithA = defaultEnv().pushEnv().defineParameter('a', '0', '2')
		const envWithAB = envWithA.defineParameter('b', '3', '5')

		assertDataflow('Read first parameter', shell, 'function(a=3, b=a) { b }',
			emptyGraph()
				.defineFunction('8', '8', ['6'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					environment:       envWithAB,
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '8',
					graph:             new Set(['0', '3', '4', '6'])
				})
				.defineVariable('0', 'a', { },  false)
				.defineVariable('3', 'b', { },  false)
				.use('4', 'a', { }, false)
				.use('6', 'b', { }, false)
				.reads('4', '0')
				.definedBy('3', '4')
				.reads('6', '3')
		)

		const envWithFirstParam = defaultEnv().pushEnv().defineParameter('a', '0', '2')
		const envWithBothParam = envWithFirstParam.defineParameter('m', '3', '5')
		const envWithBothParamSecondB = envWithBothParam.defineVariable('b', '10', '12')

		assertDataflow('Read later definition', shell, 'function(a=b, m=3) { b <- 1; a; b <- 5; a + 1 }',
			emptyGraph()
				.defineFunction('17', '17', ['15'],{
					out:               [],
					unknownReferences: [],
					in:                [],
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '17',
					environment:       envWithBothParamSecondB,
					graph:             new Set(['0', '3', '10', '6', '1', '9', '13'])
				})
				.defineVariable('0', 'a', { },  false)
				.defineVariable('3', 'm', { },  false)
				.defineVariable('10', 'b', { },  false)
				.defineVariable('6', 'b', {  },  false)
				.use('1', 'b', { }, false)
				.use('9', 'a', { }, false)
				.use('13', 'a', { }, false)
				.exit('15', '+', { environment: envWithBothParamSecondB }, false)
				.relates('15', '13')
				.sameRead('13', '9')
				.reads('9', '0')
				.reads('13', '0')
				.definedBy('0', '1')
				.reads('1', '6')
				.sameDef('10', '6')
		)
	})
	describe('Using special argument', () => {
		const envWithA = defaultEnv().pushEnv().defineParameter('a', '0', '1')
		const envWithASpecial = envWithA.defineParameter('...', '2', '3')

		assertDataflow('Return ...', shell, 'function(a, ...) { foo(...) }',
			emptyGraph()
				.defineFunction('9', '9', ['7'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '9',
					environment:       envWithASpecial,
					graph:             new Set(['0', '2', '5', '7', '6'])
				})
				.defineVariable('0', 'a', { },  false)
				.defineVariable('2', '...', { },  false)
				.use('5', '...', { }, false)
				.call('7', 'foo', [argumentInCall('6')], { environment: envWithASpecial }, false)
				.use('6',unnamedArgument('6'), { }, false)
				.argument('7', '6')
				.reads('6', '5')
				.reads('5', '2')
		)
	})
	describe('Bind environment to correct exit point', () => {
		const envWithG = defaultEnv().pushEnv().defineFunction('g', '0', '4')
		const envWithFirstY = envWithG.defineVariable('y', '5', '7')
		const finalEnv = envWithG.defineVariable('y', '15', '17')
		assertDataflow('Two possible exit points to bind y closure', shell, `function() {
  g <- function() { y }
  y <- 5
  if(z)
    return(g)
  y <- 3
  g
}`,
		emptyGraph()
			.defineFunction('20', '20', ['12', '18'], {
				out:               [],
				unknownReferences: [],
				breaks:            [],
				nexts:             [],
				returns:           [],
				entryPoint:        '20',
				in:                [ { nodeId: '8', name: 'z', controlDependency: undefined } ],
				environment:       finalEnv,
				graph:             new Set(['0', '5', '15', '8', '10', '18', '11', '12', '3'])
			})
			.defineVariable('0', 'g', { },  false)
			.defineVariable('5', 'y', { },  false)
			.defineVariable('15', 'y', { },  false)
			.use('8', 'z', { }, false)
			.use('10', 'g', { }, false)
			.use('18', 'g', { }, false)
			.use('11', unnamedArgument('11'), { }, false)
			.call('12', 'return', [argumentInCall('11')], { controlDependency: [], environment: envWithFirstY }, false)
			.defineFunction('3', '3', ['1'], {
				out:               [],
				unknownReferences: [],
				in:                [],
				breaks:            [],
				nexts:             [],
				returns:           [],
				entryPoint:        '3',
				environment:       defaultEnv().pushEnv().pushEnv(),
				graph:             new Set(['1'])
			},
			{ environment: defaultEnv().pushEnv() }, false)
			.definedBy('0', '3')
			.reads('1', '5')
			.reads('1', '15')
			.reads('18', '0')
			.reads('10', '0')
			.reads('11', '10')
			.argument('12', '11')
			.returns('12', '11')
			.reads('12', BuiltIn)
			.calls('12', BuiltIn)
			.sameDef('5', '15')
			.use('1', 'y', { }, false)
		)
	})
	describe('Late binding of environment variables', () => {
		assertDataflow('define after function definition', shell, 'function() { x }; x <- 3',
			emptyGraph()
				.defineVariable('3', 'x')
				.defineFunction('2', '2', ['0'], {
					out:               [],
					unknownReferences: [],
					in:                [{
						nodeId:            '0',
						name:              'x',
						controlDependency: undefined
					}],
					breaks:      [],
					nexts:       [],
					returns:     [],
					entryPoint:  '2',
					graph:       new Set(['0']),
					environment: defaultEnv().pushEnv()
				})
				.use('0', 'x', { }, false)
		)
	})

	describe('Nested Function Definitions', () => {
		const withXParameterInOuter = defaultEnv().pushEnv().defineFunction('x', '1', '9')
		const withinNestedFunctionWithDef = defaultEnv().pushEnv().pushEnv().defineVariable('x', '4', '6')

		assertDataflow('double nested functions', shell, 'a <- function() { x <- function(x) { x <- b }; x }; b <- 3; a',
			emptyGraph()
				.defineVariable('0', 'a')
				.defineVariable('14', 'b',  {})
				.use('17', 'a', { })
				.reads('17', '0')
				.defineFunction('12', '12', ['10'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '12',
					graph:             new Set(['10', '1', '8']),
					environment:       withXParameterInOuter
				})
				.definedBy('0', '12')

				.use('10', 'x', { }, false)
				.defineVariable('1', 'x', { },  false)
				.defineFunction('8', '8', ['6'], {
					out:               [],
					unknownReferences: [],
					in:                [{ nodeId: '5', name: 'x', controlDependency: undefined }],
					graph:             new Set(['5', '4', '2']),
					breaks:            [],
					nexts:             [],
					returns:           [],
					entryPoint:        '8',
					environment:       withinNestedFunctionWithDef
				},
				{ environment: defaultEnv().pushEnv() }, false)
				.reads('10', '1')
				.definedBy('1', '8')

				.use('5', 'b', { }, false)
				.exit('6', '<-', { environment: withinNestedFunctionWithDef }, false)
				.relates('6', '4')
				.relates('6', '5')
				.defineVariable('4', 'x', { },  false)
				.defineVariable('2', 'x', { },  false)
				.definedBy('4', '5')
				.sameDef('2', '4')
		)
	})
}))
