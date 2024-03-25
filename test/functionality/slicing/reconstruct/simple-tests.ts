import { assertReconstructed, withShell } from '../../_helper/shell'

describe('Simple', withShell(shell => {
	describe('Constant assignments', () => {
		for(const code of [
			'x <- 5',
			'x <- 5; y <- 9',
			'{ x <- 5 }',
			'{ x <- 5; y <- 9 }'
		]) {
			//some tests fail due to removed semicollons, here it is intensional but it later causes troubles
			assertReconstructed(code, shell, code, '0', 'x <- 5')
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
		for(const [code, id, expected] of [
			['a[3]', '0', 'a[3]' ],
			['a[x]', '1', 'x' ]
		]) {
			assertReconstructed(code, shell, code, id, expected)
		}
	})

	describe('Loops', () => {
		describe('repeat', () => {
			const pool: [string, string | string[], string][] = [
				['repeat { x }', '0', 'repeat { x }'],
				//semicollon removed
				['repeat { x <- 5; y <- 9 }', '0', 'repeat { x <- 5         }'],
				//semicollon has to stay, otherwise the statement loses information
				['repeat { x <- 5; y <- 9 }', ['0', '1', '4'], 'repeat { x <- 5;      9 }']
			]
			for(const [code, id, expected] of pool) {
				assertReconstructed(code, shell, code, id, expected)
			}
		})

		//output consistend "while(...) {"
		//may want to look into reconstruct for while
		describe('while', () => {
			const pool: [string, string | string[], string][] = [
				['while(TRUE) { x }', '1', 'while(TRUE) { x }'],
				['while(TRUE) { x <- 5 }', '1', 'while(TRUE) { x <- 5 }'],
				['while(TRUE) { x <- 5; y <- 9 }', '1', 'while(TRUE) { x <- 5         }'],
				['while(TRUE) { x <- 5; y <- 9 }', '0', 'while(TRUE) {                }'],
				['while(TRUE) { x <- 5; y <- 9 }', ['0', '1'], 'while(TRUE) { x <- 5         }'],
				['while(TRUE) { x <- 5; y <- 9 }', ['0', '1', '2'], 'while(TRUE) { x <- 5         }'],
				['while(TRUE) { x <- 5; y <- 9 }', ['0', '4'], 'while(TRUE) {         y <- 9 }'],
				//semicollon has to stay, otherwise the statement loses information
				['while(TRUE) { x <- 5; y <- 9 }', ['0', '1', '4'], 'while(TRUE) { x <- 5; y <- 9 }',],
				['while(TRUE) {\n    x <- 5\n    y <- 9\n}', ['0', '1', '4'], 'while(TRUE) {\n    x <- 5\n    y <- 9\n}'],
				['while(x + 2 > 3) { x <- 0 }', ['0'], 'while(x + 2 > 3) {        }'],
				['while(x + 2 > 3) { x <- 0 }', ['5'], 'while(x + 2 > 3) { x <- 0 }'],
				['while(x + 2 > 3) { x <- 0 }', ['0', '5'], 'while(x + 2 > 3) { x <- 0 }']
			]
			for(const [code, id, expected] of pool) {
				assertReconstructed(code, shell, code, id, expected)
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
			const pool: [string, string | string[], string][] = [
				[largeFor, '0', 'for (i in 1:20) {\n}'],
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
				assertReconstructed(`${JSON.stringify(id)}: ${code}`, shell, code, id, expected)
			}
		})
	})

	describe('function definition', () => {
		const testCases: {name: string, case: string, argument: string[], expected: string}[] = [
			//this test does not reconstruct the function
			{ name: 'simple function', case: 'a <- function (x) { x <- 2 }', argument: ['0'], expected: 'a <- function (x) { x <- 2 }' },
			{ name: 'function body extracted', case: 'a <- function (x) { x <- 2 }', argument: ['5'], expected: 'x <- 2' },
			//this test does not reconstruct the function
			{ name: 'multi-line function', case: 'a <- function (x) { x <- 2;\nx + 4 }', argument: ['0'], expected: 'a <- function (x) { x <- 2;\nx + 4 }' },
			{ name: 'only one function body extracted', case: 'a <- function (x) { x <- 2; x + 4 }', argument: ['5'], expected: 'x <- 2' }
		]
		for(const test of testCases) {
			assertReconstructed(test.name, shell, test.case, test.argument, test.expected)
		}
	})

	describe.only('Branches', () => {
		const testCases: {name: string, case: string, argument: string|string[], expected: string}[] = [
			{ name: 'simple if statement', case: 'if(TRUE) { x <- 3 } else { x <- 4 }\nx', argument: ['10', '8'], expected: 'if(TRUE) { x <- 3 }\nx' },
			{ name: 'false if statement', case: 'if(FALSE) { x <- 3 } else { x <- 4 }\nx', argument: '10', expected: 'if(FALSE) {        } else { x <- 4 }\nx' }
		]
		for(const test of testCases) {
			assertReconstructed(test.name, shell, test.case, test.argument, test.expected)
		}
	})
	describe('Failures in practice', () => {
		assertReconstructed('Reconstruct expression list in call', shell, `
a <- foo({
    a <- b()

    c <- 3
    })`, '0', `a <- foo({
    a <- b()

    c <- 3
    })`)
		assertReconstructed('Reconstruct access in pipe', shell, `
ls <- x[[1]] %>% st_cast()
class(ls)`, '2', 'x[[1]]')
	})
}))
