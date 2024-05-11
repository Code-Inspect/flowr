import { assertReconstructed, withShell } from '../../_helper/shell'
import { label } from '../../_helper/label'
import type { SupportedFlowrCapabilityId } from '../../../../src/r-bridge/data/get'
import { OperatorDatabase } from '../../../../src/r-bridge/lang-4.x/ast/model/operators'
import type { NodeId } from '../../../../src/r-bridge/lang-4.x/ast/model/processing/node-id'

describe('Simple', withShell(shell => {
	describe('Constant assignments', () => {
		for(const [id, code, caps] of [
			[0, 'x <- 5', ['name-normal', 'numbers', ...OperatorDatabase['<-'].capabilities]],
			[0, 'x <- 5; y <- 9', ['name-normal', 'numbers', 'semicolons', ...OperatorDatabase['<-'].capabilities]],
			[2, '{ x <- 5 }', ['grouping', 'name-normal', 'numbers', ...OperatorDatabase['<-'].capabilities]],
			[2, '{ x <- 5; y <- 9 }', ['grouping', 'name-normal', 'numbers', 'semicolons', ...OperatorDatabase['<-'].capabilities]],
		] as [number, string, SupportedFlowrCapabilityId[]][]){
			assertReconstructed(label(code, caps), shell, code, id, 'x <- 5')
		}
	})
	describe('Nested Assignments', () => {
		for(const [code, id, expected] of [
			['12 + (supi <- 42)', '0', '12 + (supi <- 42)' ],
			['y <- x <- 42', '1', 'x <- 42' ],
			['y <- x <- 42', '0', 'y <- x <- 42' ],
			// we are not smart enough right now to see, that the write is constant.
			['for(i in 1:20) { x <- 5 }', '7', 'x <- 5' ],
			['for(i in 1:20) { x <- 5 }', ['0', '4'], 'for(i in 1:20) { x <- 5 }' ]
		] as const) {
			assertReconstructed(code, shell, code, id, expected)
		}
	})

	describe('Access', () => {
		for(const [code, id, expected, caps] of [
			/* we are interested in 'a' not in the result of the access*/
			['a[3]', 0, 'a', ['single-bracket-access', 'numbers', 'name-normal'] ],
			['a[x]', 1, 'x', ['single-bracket-access', 'name-normal'] ]
		] as [string, number, string, SupportedFlowrCapabilityId[]][]) {
			assertReconstructed(label(code, caps), shell, code, id, expected)
		}
	})

	describe('Loops', () => {
		describe('repeat', () => {
			const pool: [string, NodeId | NodeId[], string, SupportedFlowrCapabilityId[]][] = [
				['repeat { x }', '0', 'repeat { x }', ['repeat-loop', 'name-normal']],
				['repeat { x <- 5; y <- 9 }', '0', 'repeat { x <- 5         }', ['repeat-loop', 'name-normal', ...OperatorDatabase['<-'].capabilities, 'semicolons', 'numbers']],
				['repeat { x <- 5; y <- 9 }', ['0', '1', '4'], 'repeat { x <- 5;      9 }', ['repeat-loop', 'name-normal', ...OperatorDatabase['<-'].capabilities, 'semicolons', 'numbers']]
			]
			for(const [code, id, expected, caps] of pool) {
				assertReconstructed(label(code, caps), shell, code, id, expected)
			}
		})

		describe('while', () => {
			const fiveNineCaps: SupportedFlowrCapabilityId[] = ['while-loop', 'logical', 'name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'semicolons']
			const pool: [string, NodeId | NodeId[], string, SupportedFlowrCapabilityId[]][] = [
				['while(TRUE) { x }', '1', 'while(TRUE) { x }', ['while-loop', 'logical', 'name-normal']],
				['while(TRUE) { x <- 5 }', '1', 'while(TRUE) { x <- 5 }', ['while-loop', 'logical', 'name-normal', 'numbers', ...OperatorDatabase['<-'].capabilities]],
				['while(TRUE) { x <- 5; y <- 9 }', '1', 'while(TRUE) { x <- 5         }', fiveNineCaps],
				['while(TRUE) { x <- 5; y <- 9 }', '0', 'while(TRUE) {}', fiveNineCaps],
				['while(TRUE) { x <- 5; y <- 9 }', ['0', '1'], 'while(TRUE) { x <- 5         }', fiveNineCaps],
				['while(TRUE) { x <- 5; y <- 9 }', ['0', '1', '2'], 'while(TRUE) { x <- 5         }', fiveNineCaps],
				['while(TRUE) { x <- 5; y <- 9 }', ['0', '4'], 'while(TRUE) {         y <- 9 }', fiveNineCaps],
				['while(TRUE) { x <- 5; y <- 9 }', ['0', '1', '4'], 'while(TRUE) { x <- 5; y <- 9 }', fiveNineCaps],
				['while(TRUE) {\n    x <- 5\n    y <- 9\n}', ['0', '1', '4'], 'while(TRUE) {\n    x <- 5\n    y <- 9\n}', fiveNineCaps],
				['while(x + 2 > 3) { x <- 0 }', ['0'], 'while(x + 2 > 3) {}', ['while-loop', 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities, 'name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers']],
				['while(x + 2 > 3) { x <- 0 }', ['5'], 'while(x + 2 > 3) { x <- 0 }', ['while-loop', 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities, 'name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers']],
				['while(x + 2 > 3) { x <- 0 }', ['0', '5'], 'while(x + 2 > 3) { x <- 0 }', ['while-loop', 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities, 'name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers']]
			]
			for(const [code, id, expected, caps] of pool) {
				assertReconstructed(label(code, caps), shell, code, id, expected)
			}
		})

		describe('for', () => {
			const largeFor = `
      for (i in 1:20) {
        y <- 9
        x <- 5
        12 -> x
      }
    `
	 const caps: SupportedFlowrCapabilityId[] = ['for-loop', 'name-normal', 'numbers', ...OperatorDatabase['<-'].capabilities, ...OperatorDatabase['->'].capabilities, 'newlines']
			const pool: [string, string | string[], string][] = [
				//here we may want the \n to carry over in the reconstruction
				[largeFor, '0', 'for (i in 1:20) {}'],
				[largeFor, '4', 'for (i in 1:20) {\n  y <- 9\n}'],
				[largeFor, ['0', '4'], 'for (i in 1:20) {\n  y <- 9\n}'],
				[largeFor, ['0', '4', '7'], `for (i in 1:20) {
  y <- 9
  x <- 5
}`],
				[largeFor, ['0', '4', '10'], `for (i in 1:20) {
  y <- 9
  12 -> x
}`],
			]

			for(const [code, id, expected] of pool) {
				assertReconstructed(label(`${JSON.stringify(id)}: ${code}`, caps), shell, code, id, expected)
			}
		})
	})

	describe('function definition', () => {
		const testCases: {name: string, case: string, argument: string[], expected: string}[] = [
			{ name: 'simple function', case: 'a <- function (x) { x <- 2 }', argument: ['0'], expected: 'a <- function (x) { x <- 2 }' },
			{ name: 'function body extracted', case: 'a <- function (x) { x <- 2 }', argument: ['5'], expected: 'x <- 2' },
			{ name: 'multi-line function', case: 'a <- function (x) { x <- 2;\nx + 4 }', argument: ['0'], expected: 'a <- function (x) { x <- 2;\nx + 4 }' },
			{ name: 'only one function body extracted', case: 'a <- function (x) { x <- 2; x + 4 }', argument: ['5'], expected: 'x <- 2' }
		]
		for(const test of testCases) {
			assertReconstructed(test.name, shell, test.case, test.argument, test.expected)
		}
	})

	describe('Branches', () => {
		const testCases: {name: string, case: string, argument: string|string[], expected: string}[] = [
			{ name: 'simple if statement', case: 'if(TRUE) { x <- 3 } else { x <- 4 }\nx', argument: ['10', '3', '0'], expected: 'if(TRUE) { x <- 3 }\nx' },
			{ name: 'false if statement', case: 'if(FALSE) { x <- 3 } else { x <- 4 }\nx', argument: ['10', '7', '0'], expected: 'if(FALSE) {} else         { x <- 4 }\nx' }
		]
		for(const test of testCases) {
			assertReconstructed(test.name, shell, test.case, test.argument, test.expected)
		}
	})

	describe('Functions in assignments', () => {
		const testCases: {name: string, case: string, argument: string|string[], expected: string}[] = [
			{ name:     'Nested Side-Effect For First',
				case:     'f <- function() {\n  a <- function() { x }\n  x <- 3\n  b <- a()\n  x <- 2\n  a()\n  b\n}\nb <- f()\n',
				argument: ['0', '1', '2', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '20', '21', '22', '23'],
				expected: 'f <- function() {\n  a <- function() { x }\n  x <- 3\n  b <- a()\n  x <- 2\n  a()\n  b\n}\nb <- f()' }
		]
		for(const test of testCases) {
			assertReconstructed(test.name, shell, test.case, test.argument, test.expected)
		}
	})
	describe('Failures in practice', () => {
		assertReconstructed(label('Reconstruct expression list in call', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'unnamed-arguments', 'call-normal', 'newlines']), shell, `
a <- foo({
    a <- b()

    c <- 3
    })`, 0, `a <- foo({
    a <- b()

    c <- 3
    })`)

		const caps: SupportedFlowrCapabilityId[] = ['name-normal', ...OperatorDatabase['<-'].capabilities, 'double-bracket-access', 'numbers', 'infix-calls', 'binary-operator', 'call-normal', 'newlines', 'unnamed-arguments', 'precedence']
		assertReconstructed(label('Reconstruct access in pipe (variable)', caps), shell, `
ls <- x[[1]] %>% st_cast()
class(ls)`, 2, 'x')
		assertReconstructed(label('Reconstruct access in pipe (access)', caps), shell, `
ls <- x[[1]] %>% st_cast()
class(ls)`, 13, 'class(ls)')
	})
}))
