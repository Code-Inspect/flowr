import { splitAtEscapeSensitive } from '../../../src/util/args'
import { assert } from 'chai'

describe('Arguments', () => {
	const positive = (input: string, expected: string[], escapeQuote = true, split = ' ') => {
		it(`${JSON.stringify(input)}`, () => {
			assert.deepEqual(splitAtEscapeSensitive(input, escapeQuote, split), expected)
		})
	}

	describe('split arguments', () => {		
		positive('', [])
		positive('a', ['a'])
		positive('a b', ['a', 'b'])
		positive('argument are cool', ['argument', 'are', 'cool'])
		positive('a "b c" d', ['a', 'b c', 'd'])
		positive('a "b\nc" d', ['a', 'b\nc', 'd'])
		// this seems to be an error with the comparison function as it does not expand escaped characters?
		positive('a "b\\nc" d', ['a', 'b\nc', 'd'])
		positive('a "b\t\r\v\f\bc" d', ['a', 'b\t\r\v\f\bc', 'd'])
		positive('a "b c" d "e f"', ['a', 'b c', 'd', 'e f'])
		positive('a \\"b c" d "e f" g', ['a', '"b', 'c d e', 'f g'])
		positive('a\\ b', ['a b'])
		positive('-c "2@x" -r "x <- 3 * 4\n y <- x * 2', ['-c', '2@x', '-r', 'x <- 3 * 4\n y <- x * 2'])
	})

	describe('split statements', () => {
		const positiveStatements = (input: string, expected: string[]) => positive(input, expected, false, ';')
		positiveStatements(':help', [':help'])
		positiveStatements(':help;:slicer', [':help', ':slicer'])
		// Try out slicer examples
		positiveStatements(':slicer -c "2@x" -r "x <- 3 * 4\n y <- x * 2"', [':slicer -c "2@x" -r "x <- 3 * 4\n y <- x * 2"'])
		positiveStatements(':slicer -c "12@product" test/testfiles/example.R', [':slicer -c "12@product" test/testfiles/example.R'])
		positiveStatements(':slicer --help; :slicer -i example.R --stats --criterion "8:3;3:1;12@product"', 
			[':slicer --help', ' :slicer -i example.R --stats --criterion "8:3;3:1;12@product"'])
	})
})
