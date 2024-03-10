/**
 * Here we cover dataflow extraction for atomic statements (no expression lists).
 * Yet, some constructs (like for-loops) require the combination of statements, they are included as well.
 * This will not include functions!
 */
import { assertDataflow, withShell } from '../../../_helper/shell'
import { MIN_VERSION_PIPE } from '../../../../../src/r-bridge/lang-4.x/ast/model/versions'
import { label } from '../../../_helper/label'
import { emptyGraph } from '../../../_helper/dataflowgraph-builder'
import { argumentInCall, defaultEnv, unnamedArgument } from '../../../_helper/environment-builder'
import { AssignmentOperators, BinaryNonAssignmentOperators, UnaryOperatorPool } from '../../../_helper/provider'
import { OperatorDatabase } from '../../../../../src'
import type { SupportedFlowrCapabilityId } from '../../../../../src/r-bridge/data'
import type { FunctionArgument } from '../../../../../src/dataflow'
import { startAndEndsWith } from '../../../../../src/util/strings'
import { BuiltIn } from '../../../../../src/dataflow'

describe('Atomic (dataflow information)', withShell(shell => {
	describe('Uninteresting Leafs', () => {
		for(const [input, id] of [
			['42', 'numbers'],
			['"test"', 'strings'],
			['\'test\'', 'strings'],
			['TRUE', 'logical'],
			['FALSE', 'logical'],
			['NA', 'numbers'],
			['NULL', 'null'],
			['Inf', 'inf-and-nan'],
			['NaN', 'inf-and-nan']
		] as [string, SupportedFlowrCapabilityId][]) {
			assertDataflow(label(input, [id]), shell, input,
				emptyGraph().constant('0')
			)
		}
	})

	assertDataflow(label('Simple Variable', ['name-normal']), shell,
		'xylophone', emptyGraph().use('0', 'xylophone')
	)

	describe('Access', () => {
		describe('Access with Constant', () => {
			assertDataflow(label('Single Constant', ['name-normal', 'numbers', 'single-bracket-access']),
				shell,'a[2]', emptyGraph()
					.call('3', '[', [argumentInCall('0-arg'), argumentInCall('2')], { returns: ['0-arg'], reads: [BuiltIn] })
					.use('0', 'a', { controlDependency: [] })
					.constant('1').reads('2', '1')
			)
			assertDataflow(label('double constant', ['name-normal', 'numbers', 'double-bracket-access']),
				shell, 'a[[2]]', emptyGraph().use('0', 'a', { controlDependency: [] })
					.call('3', '[[', [argumentInCall('0-arg'), argumentInCall('2')], { returns: ['0-arg'], reads: [BuiltIn] })
					.use('0', 'a', { controlDependency: [] })
					.constant('1').reads('2', '1')
			)
			assertDataflow(label('dollar constant', ['name-normal', 'dollar-access']),
				shell, 'a$b', emptyGraph()
					.call('3', '$', [argumentInCall('0-arg'), argumentInCall('2')], { returns: ['0-arg'], reads: [BuiltIn] })
					.use('0', 'a', { controlDependency: [] })
					.constant('1').reads('2', '1')
			)
			assertDataflow(label('at constant', ['name-normal', 'slot-access']),
				shell, 'a@b', emptyGraph()
					.call('3', '@', [argumentInCall('0-arg'), argumentInCall('2')], { returns: ['0-arg'], reads: [BuiltIn] })
					.use('0', 'a', { controlDependency: [] })
					.constant('1').reads('2', '1')
			)
			assertDataflow(label('chained constant', ['name-normal', 'numbers', 'single-bracket-access']), shell,
				'a[2][3]', emptyGraph()
					.call('3', '[', [argumentInCall('0-arg'), argumentInCall('2')], { returns: ['0-arg'], reads: [BuiltIn] })
					.use('0', 'a', { controlDependency: [] })
					.constant('1').reads('2', '1')
				// and now the outer access
					.call('6', '[', [argumentInCall('3-arg'), argumentInCall('5')], { returns: ['3-arg'], reads: [BuiltIn] })
					.constant('4').reads('5', '4')
					.reads('3-arg', '0')

			)
			assertDataflow(label('chained mixed constant', ['dollar-access', 'single-bracket-access', 'name-normal', 'numbers']), shell,
				'a[2]$a', emptyGraph()
					.call('3', '[', [argumentInCall('0-arg'), argumentInCall('2')], { returns: ['0-arg'], reads: [BuiltIn] })
					.use('0', 'a', { controlDependency: [] })
					.constant('1').reads('2', '1')
					// and now the outer access
					.call('6', '$', [argumentInCall('3-arg'), argumentInCall('5')], { returns: ['3-arg'], reads: [BuiltIn] })
					.constant('4').reads('5', '4')
					.reads('3-arg', '0')
			)
		})
		assertDataflow(label('Chained bracket access with variables', ['name-normal', 'single-bracket-access']), shell,
			'a[x][y]', emptyGraph()
				.call('3', '[', [argumentInCall('0-arg'), argumentInCall('2')], { returns: ['0-arg'], reads: [BuiltIn] })
				.use('0', 'a', { controlDependency: [] })
				.use('1', 'x')
				.reads('2', '1')
				// and now the outer access
				.call('6', '[', [argumentInCall('3-arg'), argumentInCall('5')], { returns: ['3-arg'], reads: [BuiltIn] })
				.use('4', 'y').reads('5', '4')
				.reads('3-arg', '0')
		)
		assertDataflow(label('Assign on Access', ['name-normal', 'single-bracket-access', 'local-left-assignment']), shell,
			'a[x] <- 5',
			emptyGraph()
				.use('0-arg', unnamedArgument('0-arg'), { controlDependency: [] })
				.use('4-arg', unnamedArgument('4-arg'), { controlDependency: [] })
				.argument('3', '0-arg')
				.argument('3', '4-arg')
				.reads('4-arg', '4')
				.reads('0-arg', '0')
				.call('3', '[<-', [argumentInCall('0-arg'), argumentInCall('2'), argumentInCall('4-arg')], { returns: ['0'], reads: [BuiltIn] })
				.constant('4')
				.definedBy('0', '4')
				.reads('2', '1')
				.defineVariable('0', 'a', { controlDependency: [] })
				.use('1', 'x')
		)
	})

	describe('Unary Operators', () => {
		for(const op of UnaryOperatorPool) {
			const inputDifferent = `${op}x`
			const opData = OperatorDatabase[op]
			assertDataflow(label(`${op}x`, ['unary-operator', 'name-normal', ...opData.capabilities]), shell,
				inputDifferent,
				emptyGraph()
					.call('1', op, [argumentInCall('0-arg')], { reads: [BuiltIn] })
					.use('0', 'x')
			)
		}
	})

	// these will be more interesting whenever we have more information on the edges (like modification etc.)
	describe('Non-Assignment Binary Operators', () => {
		for(const op of BinaryNonAssignmentOperators.filter(x => !startAndEndsWith(x, '%'))) {
			describe(`${op}`, () => {
				const inputDifferent = `x ${op} y`
				assertDataflow(label(`${inputDifferent} (different variables)`, ['binary-operator', 'infix-calls', 'function-calls', 'name-normal']),
					shell,
					inputDifferent,
					emptyGraph()
						.call('2', op, [argumentInCall('0-arg'), argumentInCall('1-arg')], { reads: [BuiltIn] })
						.use('0', 'x').use('1', 'y')
				)

				const inputSame = `x ${op} x`
				assertDataflow(label(`${inputSame} (same variables)`, ['binary-operator', 'infix-calls', 'function-calls', 'name-normal']),
					shell,
					inputSame,
					emptyGraph()
						.call('2', op, [argumentInCall('0-arg'), argumentInCall('1-arg')], { reads: [BuiltIn] })
						.use('0', 'x').use('1', 'x')
						.sameRead('0', '1')
				)
			})
		}
	})

	describe('Assignments Operators', () => {
		for(const op of AssignmentOperators) {
			describe(`${op}`, () => {
				const swapSourceAndTarget = op === '->' || op === '->>'
				const [variableId, constantId] = swapSourceAndTarget ? ['1', '0'] : ['0', '1']

				const args: FunctionArgument[] = [argumentInCall('0-arg'), argumentInCall('1-arg')]

				const constantAssignment = swapSourceAndTarget ? `5 ${op} x` : `x ${op} 5`
				assertDataflow(`${constantAssignment} (constant assignment)`,
					shell, constantAssignment,
					emptyGraph()
						.call('2', op, args, { reads: [BuiltIn], returns: [variableId] })
						.defineVariable(variableId, 'x', { definedBy: [constantId] })
						.constant(constantId)
				)

				const variableAssignment = `x ${op} y`
				const dataflowGraph = emptyGraph()
					.call('2', op, args, { reads: [BuiltIn], returns: [variableId] })
				if(swapSourceAndTarget) {
					dataflowGraph
						.use('0', 'x')
						.defineVariable('1', 'y', { definedBy: ['0'] })
				} else {
					dataflowGraph
						.defineVariable('0', 'x', { definedBy: ['1'] })
						.use('1', 'y')
				}
				assertDataflow(`${variableAssignment} (variable assignment)`,
					shell,
					variableAssignment,
					dataflowGraph
				)

				const circularAssignment = `x ${op} x`

				const circularGraph = emptyGraph()
					.call('2', op, args)
					.use('0-arg', unnamedArgument('0-arg'))
					.use('1-arg', unnamedArgument('1-arg'))
					.argument('2', '0-arg')
					.argument('2', '1-arg')
					.reads('1-arg', '1')
					.reads('0-arg', '0')
					.reads('2',  BuiltIn)
					.returns('2', variableId)
				if(swapSourceAndTarget) {
					circularGraph
						.use('0', 'x')
						.defineVariable('1', 'x')
						.definedBy('1', '0')
				} else {
					circularGraph
						.defineVariable('0', 'x')
						.use('1', 'x')
						.definedBy('0', '1')
				}

				assertDataflow(`${circularAssignment} (circular assignment)`,
					shell,
					circularAssignment,
					circularGraph
				)
			})
		}
		describe('Nested Assignments', () => {
			assertDataflow('"x <- y <- 1"',
				shell, 'x <- y <- 1',
				emptyGraph()
					.defineVariable('0', 'x', { definedBy: ['3', '2'] })
					.defineVariable('1', 'y', { definedBy: ['2'] })
					.constant('2')
					.call('3', '<-', [argumentInCall('1-arg'), argumentInCall('2-arg')], { returns: ['1'], reads: [BuiltIn] })
					.call('4', '<-', [argumentInCall('0-arg'), argumentInCall('3-arg')], { returns: ['0'], reads: [BuiltIn] })
					.reads('3-arg', '1')
					.reads('3-arg', '2')
					.sameRead('3', '4')
			)
			assertDataflow('"1 -> x -> y"',
				shell, '1 -> x -> y',
				emptyGraph()
					.defineVariable('1', 'x', { definedBy: ['0'] })
					.defineVariable('3', 'y', { definedBy: ['2', '0'] })
					.constant('0')
					.call('2', '->', [argumentInCall('0-arg'), argumentInCall('1-arg')], { returns: ['1'], reads: [BuiltIn] })
					.call('4', '->', [argumentInCall('2-arg'), argumentInCall('3-arg')], { returns: ['3'], reads: [BuiltIn] })
					.reads('2-arg', '0')
					.reads('2-arg', '1')
					.sameRead('2', '4')
			)
			// still by indirection (even though y is overwritten?)
			assertDataflow('"x <- 1 -> y"', shell,
				'x <- 1 -> y',
				emptyGraph()
					.defineVariable('0', 'x', { definedBy: ['3', '2'] })
					.defineVariable('1', 'y', { definedBy: ['2'] })
					.constant('2')
					.call('3', '<-', [argumentInCall('1-arg'), argumentInCall('2-arg')], { returns: ['1'], reads: [BuiltIn] })
					.call('4', '->', [argumentInCall('0-arg'), argumentInCall('3-arg')], { returns: ['0'], reads: [BuiltIn] })
					.reads('3-arg', '1')
					.reads('3-arg', '2')
					.sameRead('3', '4')
			)
			assertDataflow('"x <- y <- z"', shell,
				'x <- y <- z',
				emptyGraph()
					.defineVariable('0', 'x')
					.defineVariable('1', 'y')
					.use('2', 'z')
					.definedBy('0', '1')
					.definedBy('1', '2')
					.definedBy('0', '2')
			)
			assertDataflow('nested global assignments', shell,
				'x <<- y <<- z',
				emptyGraph()
					.defineVariable('0', 'x')
					.defineVariable('1', 'y')
					.use('2', 'z')
					.definedBy('0', '1')
					.definedBy('1', '2')
					.definedBy('0', '2')
			)
			assertDataflow('nested global mixed with local assignments', shell,
				'x <<- y <- y2 <<- z',
				emptyGraph()
					.defineVariable('0', 'x')
					.defineVariable('1', 'y')
					.defineVariable('2', 'y2')
					.use('3', 'z')
					.definedBy('0', '1')
					.definedBy('0', '2')
					.definedBy('0', '3')
					.definedBy('1', '2')
					.definedBy('1', '3')
					.definedBy('2', '3')
			)
			assertDataflow('Use Assignment on Target Side', shell,
				'a[x] <- x <- 3',
				emptyGraph()
					.defineVariable('0', 'x')
					.defineVariable('1', 'y')
					.defineVariable('2', 'y2')
					.use('3', 'z')
					.definedBy('0', '1')
					.definedBy('0', '2')
					.definedBy('0', '3')
					.definedBy('1', '2')
					.definedBy('1', '3')
					.definedBy('2', '3')
			)
			assertDataflow('Use Assignment on Target Side (inv)', shell,
				'3 -> x -> a[x]',
				emptyGraph()
					.defineVariable('0', 'x')
					.defineVariable('1', 'y')
					.defineVariable('2', 'y2')
					.use('3', 'z')
					.definedBy('0', '1')
					.definedBy('0', '2')
					.definedBy('0', '3')
					.definedBy('1', '2')
					.definedBy('1', '3')
					.definedBy('2', '3')
			)
		})

		describe('known impact assignments', () => {
			describe('loops return invisible null', () => {
				for(const assignment of [ { str: '<-', defId: ['0','0','0'], readId: ['1','1','1'], swap: false },
					{ str: '<<-', defId: ['0','0','0'], readId: ['1','1','1'], swap: false }, { str: '=', defId: ['0','0','0'], readId: ['1','1','1'], swap: false },
					/* two for parenthesis necessary for precedence */
					{ str: '->', defId: ['3', '4', '7'], readId: ['0','0','0'], swap: true }, { str: '->>', defId: ['3', '4', '7'], readId: ['0','0','0'], swap: true }] ) {
					describe(`${assignment.str}`, () => {
						for(const wrapper of [(x: string) => x, (x: string) => `{ ${x} }`]) {
							const build = (a: string, b: string) => assignment.swap ? `(${wrapper(b)}) ${assignment.str} ${a}` : `${a} ${assignment.str} ${wrapper(b)}`

							const repeatCode = build('x', 'repeat x')
							assertDataflow(`"${repeatCode}"`, shell, repeatCode, emptyGraph()
								.defineVariable(assignment.defId[0], 'x')
								.use(assignment.readId[0], 'x')
							)

							const whileCode = build('x', 'while (x) 3')
							assertDataflow(`"${whileCode}"`, shell, whileCode, emptyGraph()
								.defineVariable(assignment.defId[1], 'x')
								.use(assignment.readId[1], 'x'))

							const forCode = build('x', 'for (x in 1:4) 3')
							assertDataflow(`"${forCode}"`, shell, forCode,
								emptyGraph()
									.defineVariable(assignment.defId[2], 'x')
									.defineVariable(assignment.readId[2], 'x')
							)
						}
					})
				}
			})
		})
		describe('assignment with function call', () => {
			assertDataflow('define call with multiple args should only be defined by the call-return', shell, 'a <- foo(x=3,y,z)',
				emptyGraph()
					.defineVariable('0', 'a')
					.call('9', 'foo', [
						argumentInCall('4', 'x'),
						argumentInCall('6'),
						argumentInCall('8')
					])
					.use('4', 'x')
					.use('5', 'y')
					.use('6', unnamedArgument('6'))
					.use('7', 'z')
					.use('8', unnamedArgument('8'))
					.definedBy('0', '9')
					.argument('9', '4')
					.argument('9', '6')
					.argument('9', '8')
					.reads('6', '5')
					.reads('8', '7')
			)
		})
	})

	describe('Pipes', () => {
		describe('Passing one argument', () => {
			assertDataflow(label('No parameter function', ['built-in-pipe-and-pipe-bind']), shell, 'x |> f()',
				emptyGraph()
					.use('0', 'x')
					.call('3', 'f', [
						{ name: unnamedArgument('1'), nodeId: '1' }
					])
					.use('1', unnamedArgument('1'))
					.argument('3', '1')
					.reads('1', '0'),
				{ minRVersion: MIN_VERSION_PIPE }
			)
			assertDataflow(label('Nested calling', ['built-in-pipe-and-pipe-bind', 'call-normal', 'built-in-pipe-and-pipe-bind', 'name-normal']), shell, 'x |> f() |> g()',
				emptyGraph()
					.use('0', 'x')
					.call('3', 'f', [
						{ name: unnamedArgument('1'), nodeId: '1' }
					])
					.call('7', 'g', [
						{ name: unnamedArgument('5'), nodeId: '5' }
					])
					.use('1', unnamedArgument('1'))
					.use('5', unnamedArgument('5'))
					.argument('3', '1')
					.argument('7', '5')
					.reads('5', '3')
					.reads('1', '0'),
				{ minRVersion: MIN_VERSION_PIPE }
			)
			assertDataflow(label('Multi-Parameter function', ['built-in-pipe-and-pipe-bind', 'call-normal', 'built-in-pipe-and-pipe-bind', 'name-normal', 'unnamed-arguments']), shell, 'x |> f(y,z)',
				emptyGraph()
					.use('0', 'x')
					.call('7', 'f', [
						{ name: unnamedArgument('1'), nodeId: '1' },
						{ name: unnamedArgument('4'), nodeId: '4' },
						{ name: unnamedArgument('6'), nodeId: '6' }
					])
					.use('1', unnamedArgument('1'))
					.use('4', unnamedArgument('4'))
					.use('6', unnamedArgument('6'))
					.use('0', 'x')
					.use('3', 'y')
					.use('5', 'z')
					.argument('7', '1')
					.argument('7', '4')
					.argument('7', '6')
					.reads('1', '0')
					.reads('4', '3')
					.reads('6', '5'),
				{ minRVersion: MIN_VERSION_PIPE }
			)
		})
	})


	describe('if-then-else', () => {
		// spacing issues etc. are dealt with within the parser, however, braces are not allowed to introduce scoping artifacts
		for(const b of [
			{ label: 'without braces', func: (x: string) => `${x}` },
			{ label: 'with braces', func: (x: string) => `{ ${x} }` },
		]) {
			describe(`Variant ${b.label}`, () => {
				describe('if-then, no else', () => {
					assertDataflow('completely constant', shell,
						`if (TRUE) ${b.func('1')}`,
						emptyGraph()
					)
					assertDataflow('compare cond.', shell,
						`if (x > 5) ${b.func('1')}`,
						emptyGraph().use('0', 'x')
					)
					assertDataflow('compare cond. symbol in then', shell,
						`if (x > 5) ${b.func('y')}`,
						emptyGraph().use('0', 'x')
							.use('3', 'y', { controlDependency: [] })
					)
					assertDataflow('all variables', shell,
						`if (x > y) ${b.func('z')}`,
						emptyGraph()
							.use('0', 'x')
							.use('1', 'y')
							.use('3', 'z', { controlDependency: [] })
					)
					assertDataflow('all variables, some same', shell,
						`if (x > y) ${b.func('x')}`,
						emptyGraph()
							.use('0', 'x')
							.use('1', 'y')
							.use('3', 'x', { controlDependency: [] })
							.sameRead('0', '3')
					)
					assertDataflow('all same variables', shell,
						`if (x > x) ${b.func('x')}`,
						emptyGraph()
							.use('0', 'x')
							.use('1', 'x')
							.use('3', 'x', { controlDependency: [] })
							.sameRead('0', '1')
							// theoretically, they just have to be connected, so 0 is just hardcoded
							.sameRead('0', '3')
					)
					assertDataflow('definition in if', shell,
						`if (x <- 3) ${b.func('x')}`,
						emptyGraph()
							.defineVariable('0', 'x')
							.use('3', 'x', { controlDependency: [] })
							.reads('3', '0')
					)
				})

				describe('if-then, with else', () => {
					assertDataflow('completely constant', shell,
						'if (TRUE) { 1 } else { 2 }',
						emptyGraph()
					)
					assertDataflow('compare cond.', shell,
						'if (x > 5) { 1 } else { 42 }',
						emptyGraph().use('0', 'x')
					)
					assertDataflow('compare cond. symbol in then', shell,
						'if (x > 5) { y } else { 42 }',
						emptyGraph().use('0', 'x').use('3', 'y', { controlDependency: [] })
					)
					assertDataflow('compare cond. symbol in then & else', shell,
						'if (x > 5) { y } else { z }',
						emptyGraph()
							.use('0', 'x')
							.use('3', 'y', { controlDependency: [] })
							.use('5', 'z', { controlDependency: [] })
					)
					assertDataflow('all variables', shell,
						'if (x > y) { z } else { a }',
						emptyGraph()
							.use('0', 'x')
							.use('1', 'y')
							.use('3', 'z', { controlDependency: [] })
							.use('5', 'a', { controlDependency: [] })
					)
					assertDataflow('all variables, some same', shell,
						'if (y > x) { x } else { y }',
						emptyGraph()
							.use('0', 'y')
							.use('1', 'x')
							.use('3', 'x', { controlDependency: [] })
							.use('5', 'y', { controlDependency: [] })
							.sameRead('1', '3')
							.sameRead('0', '5')
					)
					assertDataflow('all same variables', shell,
						'if (x > x) { x } else { x }',
						emptyGraph()
							.use('0', 'x')
							.use('1', 'x')
							.use('3', 'x', { controlDependency: [] })
							.use('5', 'x', { controlDependency: [] })
							// 0 is just hardcoded, they actually just have to be connected
							.sameRead('0', '1')
							.sameRead('0', '3')
							.sameRead('0', '5')
					)
				})
			})
		}
	})
	describe('inline non-strict boolean operations', () => {
		assertDataflow('define call with multiple args should only be defined by the call-return', shell, 'y <- 15; x && (y <- 13); y',
			emptyGraph()
				.defineVariable('0', 'y')
				.defineVariable('4', 'y', { })
				.use('3', 'x')
				.use('8', 'y')
				.reads('8', '0')
				.reads('8', '4')
				.sameDef('0', '4')
		)
	})

	describe('loops', () => {
		describe('for', () => {
			assertDataflow('simple constant for-loop', shell,
				'for(i in 1:10) { 1 }',
				emptyGraph().defineVariable('0', 'i')
			)
			assertDataflow('using loop variable in body', shell,
				'for(i in 1:10) { i }',
				emptyGraph()
					.defineVariable('0', 'i')
					.use('4', 'i', { controlDependency: [] })
					.reads('4', '0')
			)
		})

		describe('repeat', () => {
			assertDataflow('simple constant repeat', shell,
				'repeat 2',
				emptyGraph()
			)
			assertDataflow('using loop variable in body', shell,
				'repeat x',
				emptyGraph().use('0', 'x')
			)
			assertDataflow('using loop variable in body', shell,
				'repeat { x <- 1 }',
				emptyGraph().defineVariable('0', 'x')
			)
			assertDataflow('using variable in body', shell,
				'repeat { x <- y }',
				emptyGraph()
					.defineVariable('0', 'x')
					.use('1', 'y')
					.definedBy('0', '1')
			)
		})
	})
}))