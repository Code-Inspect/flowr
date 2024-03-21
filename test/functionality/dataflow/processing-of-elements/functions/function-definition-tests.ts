import { assertDataflow, withShell } from '../../../_helper/shell'
import { BuiltIn } from '../../../../../src/dataflow'
import { GlobalScope, LocalScope } from '../../../../../src/dataflow/environments/scopes'
import { emptyGraph } from '../../../_helper/dataflowgraph-builder'
import { argumentInCall, defaultEnvironment, unnamedArgument } from '../../../_helper/environment-builder'

describe('Function Definition', withShell(shell => {
	describe('Only functions', () => {
		assertDataflow('unknown read in function', shell, 'function() { x }',
			emptyGraph()
				.defineFunction('2', '2', ['0'], {
					out:               [],
					unknownReferences: [],
					in:                [{ nodeId: '0', used: 'always', name: 'x', scope: LocalScope }],
					scope:             LocalScope,
					graph:             new Set(['0']),
					environments:      defaultEnvironment().pushEnv()	
				})
				.use('0', 'x', { environment: defaultEnvironment().pushEnv() }, false)
		)

		const envWithXDefined = defaultEnvironment().pushEnv().defineParameter('x', '0', '1')
		assertDataflow('read of parameter', shell, 'function(x) { x }',
			emptyGraph()
				.defineFunction('4', '4', ['2'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					scope:             LocalScope,
					graph:             new Set(['0', '2']),
					environments:      envWithXDefined
				})
				.defineVariable('0', 'x', LocalScope, { environment: defaultEnvironment().pushEnv() },  false)
				.use('2', 'x', { environment: envWithXDefined }, false)
				.reads('2', '0')
		)
		assertDataflow('read of parameter in return', shell, 'function(x) { return(x) }',
			emptyGraph()
				.defineFunction('7', '7', ['5'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					scope:             LocalScope,
					graph:             new Set(['4', '5', '3', '0']),
					environments:      envWithXDefined
				})
				.defineVariable('0', 'x', LocalScope, { environment: defaultEnvironment().pushEnv() },  false)
				.use('3', 'x', { environment: envWithXDefined }, false)
				.call('5', 'return', [argumentInCall('4')], { environment: envWithXDefined }, false)
				.use('4',unnamedArgument('4'), { environment: envWithXDefined }, false)
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
						scope:             LocalScope,
						graph:             new Set(['5', '6', '4', '0']),
						environments:      envWithXDefined
					})
					.defineVariable('0', 'x', LocalScope, { environment: defaultEnvironment().pushEnv() },  false)
					.use('4', 'x', { environment: envWithXDefined }, false)
					.call('6', 'return', [argumentInCall('5', 'x')], { environment: envWithXDefined }, false)
					.use('5', 'x', { environment: envWithXDefined }, false)
					.reads('6', BuiltIn)
					.calls('6', BuiltIn)
					.reads('4', '0')
					.argument('6', '5')
					.returns('6', '5')
					.reads('5', '4')
			)
		})

		const envWithoutParams = defaultEnvironment().pushEnv()
		const envWithXParam = envWithoutParams.defineParameter('x', '0', '1')
		const envWithXYParam = envWithXParam.defineParameter('y', '2', '3')
		const envWithXYZParam = envWithXYParam.defineParameter('z', '4', '5')

		assertDataflow('read of one parameter', shell, 'function(x,y,z) y',
			emptyGraph()
				.defineFunction('8', '8', ['6'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					scope:             LocalScope,
					graph:             new Set(['0', '2', '4', '6']),
					environments:      envWithXYZParam
				})
				.defineVariable('0', 'x', LocalScope, { environment: envWithoutParams },  false)
				.defineVariable('2', 'y', LocalScope, { environment: envWithXParam },  false)
				.defineVariable('4', 'z', LocalScope, { environment: envWithXYParam },  false)
				.use('6', 'y', { environment: envWithXYZParam }, false)
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
					in:                [ { nodeId: '3', scope: LocalScope, name: 'x', used: 'always' } ],
					scope:             LocalScope,
					graph:             new Set(['3']),
					environments:      defaultEnvironment().pushEnv()
				})
				.use('3', 'x', { environment: defaultEnvironment().pushEnv() }, false)
		)
		const envWithXDefined = defaultEnvironment().pushEnv().defineVariable('x', '0', '2')
		assertDataflow('local define with <- in function, read after', shell, 'function() { x <- 3; }; x',
			emptyGraph()
				.use('5', 'x')
				.defineFunction('4', '4', ['2' /* the assignment */], {
					out:               [],
					unknownReferences: [],
					in:                [],
					scope:             LocalScope,
					graph:             new Set(['0']),
					environments:      envWithXDefined
				})
				.defineVariable('0', 'x', LocalScope, { environment: defaultEnvironment().pushEnv() },  false)
				.exit('2', '<-', envWithXDefined, {}, false)
				.relates('2', '0')
		)
		assertDataflow('local define with = in function, read after', shell, 'function() { x = 3; }; x',
			emptyGraph()
				.use('5', 'x')
				.defineFunction('4', '4', ['2'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					scope:             LocalScope,
					graph:             new Set(['0']),
					environments:      envWithXDefined
				})
				.defineVariable('0', 'x', LocalScope, { environment: defaultEnvironment().pushEnv() },  false)
				.exit('2', '=', envWithXDefined, {}, false)
				.relates('2', '0')
		)

		const envWithXDefinedR = defaultEnvironment().pushEnv().defineVariable('x', '1', '2')
		assertDataflow('local define with -> in function, read after', shell, 'function() { 3 -> x; }; x',
			emptyGraph()
				.use('5', 'x')
				.defineFunction('4', '4', ['2'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					scope:             LocalScope,
					graph:             new Set(['1']),
					environments:      envWithXDefinedR
				})
				.defineVariable('1', 'x', LocalScope, { environment: defaultEnvironment().pushEnv() },  false)
				.exit('2', '->', envWithXDefinedR, {}, false)
				.relates('2', '1')
		)
		const envWithXDefinedGlobal = defaultEnvironment().pushEnv().defineVariable('x', '0', '2', GlobalScope)
		assertDataflow('global define with <<- in function, read after', shell, 'function() { x <<- 3; }; x',
			emptyGraph()
				.use('5', 'x')
				.defineFunction('4', '4', ['2'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					scope:             LocalScope,
					graph:             new Set(['0']),
					environments:      envWithXDefinedGlobal
				},
				{ environment: envWithXDefinedGlobal.popEnv() }
				)
				.defineVariable('0', 'x', GlobalScope, { environment: defaultEnvironment().pushEnv() },  false)
				.exit('2', '<<-', envWithXDefinedGlobal, {}, false)
				.relates('2', '0')
		)
		const envWithXDefinedGlobalR = defaultEnvironment().pushEnv().defineVariable('x', '1', '2', GlobalScope)
		assertDataflow('global define with ->> in function, read after', shell, 'function() { 3 ->> x; }; x',
			emptyGraph()
				.use('5', 'x')
				.defineFunction('4', '4', ['2'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					scope:             LocalScope,
					graph:             new Set(['1']),
					environments:      envWithXDefinedGlobalR
				},
				{ environment: envWithXDefinedGlobalR.popEnv() }
				)
				.defineVariable('1', 'x', GlobalScope, { environment: defaultEnvironment().pushEnv() },  false)
				.exit('2', '->>', envWithXDefinedGlobalR, {}, false)
				.relates('2', '1')
		)
		const envDefXSingle = defaultEnvironment().pushEnv().defineVariable('x', '3', '5')
		assertDataflow('shadow in body', shell, 'x <- 2; function() { x <- 3; x }; x',
			emptyGraph()
				.defineVariable('0', 'x')
				.use('9', 'x', {
					environment: defaultEnvironment().defineVariable('x', '0', '2')
				})
				.reads('9', '0')
				.defineFunction('8', '8', ['6'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					scope:             LocalScope,
					graph:             new Set(['6', '3']),
					environments:      envDefXSingle
				})
				.use('6', 'x', { environment: defaultEnvironment().pushEnv().defineVariable('x', '3', '5') },  false)
				.defineVariable('3', 'x', LocalScope, { environment: defaultEnvironment().pushEnv() },  false)
				.reads('6', '3')
		)
		assertDataflow('shadow in body with closure', shell, 'x <- 2; function() { x <- x; x }; x',
			emptyGraph()
				.defineVariable('0', 'x')
				.use('9', 'x', {
					environment: defaultEnvironment().defineVariable('x', '0', '2')
				})
				.reads('9', '0')
				.defineFunction('8', '8', ['6'], {
					out:               [],
					unknownReferences: [],
					in:                [ { nodeId: '4', used: 'always', name: 'x', scope: LocalScope } ],
					scope:             LocalScope,
					graph:             new Set(['3', '4', '6']),
					environments:      envDefXSingle
				})
				.defineVariable('3', 'x', LocalScope, { environment: defaultEnvironment().pushEnv() },  false)
				.use('4', 'x', { environment: defaultEnvironment().pushEnv() }, false)
				.use('6', 'x', {
					environment: defaultEnvironment().pushEnv().defineVariable('x', '3', '5'),
				}, false)
				.reads('6', '3')
				.definedBy('3', '4')
		)
	})
	describe('Scoping of parameters', () => {
		const envWithXDefined = defaultEnvironment().pushEnv().defineParameter('x', '3', '4')
		assertDataflow('parameter shadows', shell, 'x <- 3; function(x) { x }',
			emptyGraph()
				.defineVariable('0', 'x')
				.defineFunction('7', '7', ['5'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					scope:             LocalScope,
					graph:             new Set(['3', '5']),
					environments:      envWithXDefined
				})
				.defineVariable('3', 'x', LocalScope, { environment: defaultEnvironment().pushEnv() },  false)
				.use('5', 'x', { environment: envWithXDefined }, false)
				.reads('5', '3')
		)
	})
	describe('Access dot-dot-dot', () => {
		const envWithParam = defaultEnvironment().pushEnv().defineParameter('...', '0', '1')
		assertDataflow('parameter shadows', shell, 'function(...) { ..11 }',
			emptyGraph()
				.defineFunction('4', '4', ['2'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					scope:             LocalScope,
					graph:             new Set(['0', '2']),
					environments:      envWithParam			
				})
				.defineVariable('0', '...', LocalScope, { environment: defaultEnvironment().pushEnv() },  false)
				.use('2', '..11', { environment: envWithParam }, false)
				.reads('2', '0')
		)
	})
	describe('Using named arguments', () => {
		const envWithA = defaultEnvironment().pushEnv().defineParameter('a', '0', '2')
		const envWithAB = envWithA.defineParameter('b', '3', '5')

		assertDataflow('Read first parameter', shell, 'function(a=3, b=a) { b }',
			emptyGraph()
				.defineFunction('8', '8', ['6'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					scope:             LocalScope,
					environments:      envWithAB,
					graph:             new Set(['0', '3', '4', '6'])
				})
				.defineVariable('0', 'a', LocalScope, { environment: defaultEnvironment().pushEnv() },  false)
				.defineVariable('3', 'b', LocalScope, { environment: envWithA },  false)
				.use('4', 'a', { environment: envWithA }, false)
				.use('6', 'b', { environment: envWithAB }, false)
				.reads('4', '0')
				.definedBy('3', '4', 'maybe' /* default values can be overridden */)
				.reads('6', '3')
		)

		const envWithFirstParam = defaultEnvironment().pushEnv().defineParameter('a', '0', '2')
		const envWithBothParam = envWithFirstParam.defineParameter('m', '3', '5')
		const envWithBothParamFirstB = envWithBothParam.defineVariable('b', '6', '8')
		const envWithBothParamSecondB = envWithBothParam.defineVariable('b', '10', '12')

		assertDataflow('Read later definition', shell, 'function(a=b, m=3) { b <- 1; a; b <- 5; a + 1 }',
			emptyGraph()
				.defineFunction('17', '17', ['15'],{
					out:               [],
					unknownReferences: [],
					in:                [],
					scope:             LocalScope,
					environments:      envWithBothParamSecondB,
					graph:             new Set(['0', '3', '10', '6', '1', '9', '13'])
				})
				.defineVariable('0', 'a', LocalScope, { environment: defaultEnvironment().pushEnv() },  false)
				.defineVariable('3', 'm', LocalScope, { environment: envWithFirstParam },  false)
				.defineVariable('10', 'b', LocalScope, { environment: envWithBothParamFirstB },  false)
				.defineVariable('6', 'b', LocalScope, { environment: envWithBothParam },  false)
				.use('1', 'b', { environment: defaultEnvironment().pushEnv() }, false)
				.use('9', 'a', { environment: envWithBothParamFirstB }, false)
				.use('13', 'a', { environment: envWithBothParamSecondB }, false)
				.exit('15', '+', envWithBothParamSecondB, {}, false)
				.relates('15', '13')
				.sameRead('13', '9')
				.reads('9', '0')
				.reads('13', '0')
				.definedBy('0', '1', 'maybe')
				.reads('1', '6')
				.sameDef('10', '6')
		)
	})
	describe('Using special argument', () => {
		const envWithA = defaultEnvironment().pushEnv().defineParameter('a', '0', '1')
		const envWithASpecial = envWithA.defineParameter('...', '2', '3')

		assertDataflow('Return ...', shell, 'function(a, ...) { foo(...) }',
			emptyGraph()
				.defineFunction('9', '9', ['7'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					scope:             LocalScope,
					environments:      envWithASpecial,
					graph:             new Set(['0', '2', '5', '7', '6'])
				})
				.defineVariable('0', 'a', LocalScope, { environment: defaultEnvironment().pushEnv() },  false)
				.defineVariable('2', '...', LocalScope, { environment: envWithA },  false)
				.use('5', '...', { environment: envWithASpecial }, false)
				.call('7', 'foo', [argumentInCall('6')], { environment: envWithASpecial }, false)
				.use('6',unnamedArgument('6'), { environment: envWithASpecial }, false)
				.argument('7', '6')
				.reads('6', '5')
				.reads('5', '2')
		)
	})
	describe('Bind environment to correct exit point', () => {
		const envWithG = defaultEnvironment().pushEnv().defineFunction('g', '0', '4')
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
				in:                [ { nodeId: '8', name: 'z', used: 'always', scope: LocalScope } ],
				scope:             LocalScope,
				environments:      finalEnv,
				graph:             new Set(['0', '5', '15', '8', '10', '18', '11', '12', '3'])
			})
			.defineVariable('0', 'g', LocalScope, { environment: defaultEnvironment().pushEnv() },  false)
			.defineVariable('5', 'y', LocalScope, { environment: envWithG },  false)
			.defineVariable('15', 'y', LocalScope, { environment: envWithFirstY },  false)
			.use('8', 'z', { environment: envWithFirstY }, false)
			.use('10', 'g', { environment: envWithFirstY }, false)
			.use('18', 'g', { environment: finalEnv }, false)
			.use('11', unnamedArgument('11'), { environment: envWithFirstY }, false)
			.call('12', 'return', [argumentInCall('11')], { when: 'maybe', environment: envWithFirstY }, false)
			.defineFunction('3', '3', ['1'], {
				out:               [],
				unknownReferences: [],
				in:                [],
				scope:             LocalScope,
				environments:      defaultEnvironment().pushEnv().pushEnv(),
				graph:             new Set(['1'])
			},
			{ environment: defaultEnvironment().pushEnv() }, false)
			.definedBy('0', '3')
			.reads('1', '5', 'maybe')
			.reads('1', '15', 'maybe')
			.reads('18', '0')
			.reads('10', '0')
			.reads('11', '10')
			.argument('12', '11')
			.returns('12', '11')
			.reads('12', BuiltIn, 'maybe')
			.calls('12', BuiltIn, 'maybe')
			.sameDef('5', '15')
			.use('1', 'y', { environment: defaultEnvironment().pushEnv().pushEnv() }, false)
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
						nodeId: '0',
						scope:  LocalScope,
						name:   'x',
						used:   'always'
					}],
					scope:        LocalScope,
					graph:        new Set(['0']),
					environments: defaultEnvironment().pushEnv()
				})
				.use('0', 'x', { environment: defaultEnvironment().pushEnv() }, false)
		)
	})

	describe('Nested Function Definitions', () => {
		const withXParameterInOuter = defaultEnvironment().pushEnv().defineFunction('x', '1', '9')
		const withinNestedFunctionWithoutParam = defaultEnvironment().pushEnv().pushEnv()
		const withinNestedFunctionWithParam = withinNestedFunctionWithoutParam.defineParameter('x', '2', '3')
		const withinNestedFunctionWithDef = defaultEnvironment().pushEnv().pushEnv().defineVariable('x', '4', '6')
		const envWithA = defaultEnvironment().defineFunction('a', '0', '13')
		const envWithAB = envWithA.defineVariable('b', '14', '16')

		assertDataflow('double nested functions', shell, 'a <- function() { x <- function(x) { x <- b }; x }; b <- 3; a',
			emptyGraph()
				.defineVariable('0', 'a')
				.defineVariable('14', 'b', LocalScope,  { environment: envWithA })
				.use('17', 'a', { environment: envWithAB })
				.reads('17', '0', 'always')
				.defineFunction('12', '12', ['10'], {
					out:               [],
					unknownReferences: [],
					in:                [],
					scope:             LocalScope,
					graph:             new Set(['10', '1', '8']),
					environments:      withXParameterInOuter
				})
				.definedBy('0', '12')

				.use('10', 'x', { environment: withXParameterInOuter }, false)
				.defineVariable('1', 'x', LocalScope, { environment: defaultEnvironment().pushEnv() },  false)
				.defineFunction('8', '8', ['6'], {
					out:               [],
					unknownReferences: [],
					in:                [{
						nodeId: '5',
						scope:  LocalScope,
						name:   'x',
						used:   'always'
					}],
					scope:        LocalScope,
					graph:        new Set(['5', '4', '2']),
					environments: withinNestedFunctionWithDef
				},
				{ environment: defaultEnvironment().pushEnv() }, false)
				.reads('10', '1')
				.definedBy('1', '8')

				.use('5', 'b', { environment: withinNestedFunctionWithParam }, false)
				.exit('6', '<-', withinNestedFunctionWithDef, {}, false)
				.relates('6', '4')
				.relates('6', '5')
				.defineVariable('4', 'x', LocalScope, { environment: withinNestedFunctionWithParam },  false)
				.defineVariable('2', 'x', LocalScope, { environment: withinNestedFunctionWithoutParam },  false)
				.definedBy('4', '5')
				.sameDef('2', '4')
		)
	})
}))
