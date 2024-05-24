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
			assertReconstructed(label(code, caps), shell, code, id, 'x')
		}
	})
	describe('Nested Assignments', () => {
		for(const [code, id, expected, caps] of [
			['12 + (supi <- 42)', 0, '12', ['grouping', 'name-normal', ...OperatorDatabase['<-'].capabilities, ...OperatorDatabase['+'].capabilities, 'precedence']],
			['y <- x <- 42', 1, 'x', ['name-normal', 'numbers', 'return-value-of-assignments', ...OperatorDatabase['<-'].capabilities, 'precedence'] ],
			['y <- x <- 42', 0, 'y', ['name-normal', 'numbers', 'return-value-of-assignments', ...OperatorDatabase['<-'].capabilities, 'precedence'] ],
			['for (i in 1:20) { x <- 5 }', 6, 'x', ['for-loop', 'name-normal', 'numbers', ...OperatorDatabase['<-'].capabilities] ]
		] as [string, number, string, SupportedFlowrCapabilityId[]][]) {
			assertReconstructed(label(code, caps), shell, code, id, expected)
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
				['repeat { x }', 2, 'x', ['repeat-loop', 'name-normal']],
				['repeat { x <- 5; y <- 9 }', 2, 'x', ['repeat-loop', 'name-normal', ...OperatorDatabase['<-'].capabilities, 'semicolons', 'numbers']],
				['repeat { x <- 5; y <- 9 }', [2, 4, 6], 'x <- 5\n9', ['repeat-loop', 'name-normal', ...OperatorDatabase['<-'].capabilities, 'semicolons', 'numbers']]
			]
			for(const [code, id, expected, caps] of pool) {
				assertReconstructed(label(code, caps), shell, code, id, expected)
			}
		})

		describe('while', () => {
			const fiveNineCaps: SupportedFlowrCapabilityId[] = ['while-loop', 'logical', 'name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'semicolons']
			const pool: [string, NodeId | NodeId[], string, SupportedFlowrCapabilityId[]][] = [
				['while(TRUE) { x }', 3, 'x', ['while-loop', 'logical', 'name-normal']],
				['while(TRUE) { x <- 5 }', 3, 'x', ['while-loop', 'logical', 'name-normal', 'numbers', ...OperatorDatabase['<-'].capabilities]],
				['while(TRUE) { x <- 5; y <- 9 }', 3, 'x', fiveNineCaps],
				['while(TRUE) { x <- 5; y <- 9 }', [10, 3], 'while(TRUE) x', fiveNineCaps],
				['while(TRUE) { x <- 5; y <- 9 }', [10, 3, 5], 'while(TRUE) x <- 5', fiveNineCaps],
				['while(TRUE) { x <- 5; y <- 9 }', [10, 6], 'while(TRUE) y', fiveNineCaps],
				['while(TRUE) { x <- 5; y <- 9 }', [3, 4, 6], 'x <- 5\ny', fiveNineCaps],
				['while(x + 2 > 3) { x <- 0 }', [7], 'x', ['while-loop', 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities, 'name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers']],
				['while(x + 2 > 3) { x <- 0 }', [0, 7], 'while(x + 2 > 3) x', ['while-loop', 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities, 'name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers']]
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
			const pool: [string, NodeId | NodeId[], string][] = [
				[largeFor, 0, 'for(i in 1:20) {}'],
				[largeFor, 6, 'y'],
				[largeFor, [6, 16], 'for(i in 1:20) y'],
				[largeFor, [6, 9], 'y\nx'],
				[largeFor, [6, 12, 16], `for(i in 1:20) {
    y
    12
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
    })`, 0, 'a')

		const caps: SupportedFlowrCapabilityId[] = ['name-normal', ...OperatorDatabase['<-'].capabilities, 'double-bracket-access', 'numbers', 'infix-calls', 'binary-operator', 'call-normal', 'newlines', 'unnamed-arguments', 'precedence', 'special-operator']
		assertReconstructed(label('Reconstruct access in pipe (variable)', caps), shell, `
ls <- x[[1]] %>% st_cast()
class(ls)`, 2, 'x')
		assertReconstructed(label('Reconstruct access in pipe (access)', caps), shell, `
ls <- x[[1]] %>% st_cast()
class(ls)`, 13, 'ls')
	})
}))
