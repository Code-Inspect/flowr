/**
 * Just to avoid another library for splitting arguments, we use this module to provide what we need.
 *
 * @module
 */

/**
 * This splits an input string on the given split string (e.g., ` `) but checks if the string is quoted or escaped.
 *
 * Given an input string like `a "b c" d` with a space character as split this splits the arguments similar to common shell interpreters (i.e., `a`, `b c`, and `d`).
 *
 * @param inputString - The string to split
 * @param split       - The **single** character to split on (can not be the backslash or quote)
 */
export function splitAtEscapeSensitive(inputString: string, split = ' '): string[] {
	const args = []
	let current = ''
	let inQuotes = false
	let escaped = false

	for(const c of inputString) {
		if(escaped) {
			escaped = false
			switch(c) {
				case 'n': current += '\n'; break
				case 't': current += '\t'; break
				case 'r': current += '\r'; break
				case 'v': current += '\v'; break
				case 'f': current += '\f'; break
				case 'b': current += '\b'; break
				default: current += c
			}
		} else if(c === split && !inQuotes && current !== '') {
			args.push(current)
			current = ''
		} else if(c === '"' || c === "'") {
			inQuotes = !inQuotes
		} else if(c === '\\') {
			escaped = true
		} else {
			current += c
		}
	}

	if(current !== '') {
		args.push(current)
	}

	return args
}

/**
 * This splits an input string on the given split string (e.g., ` `) but checks if the string is quoted or escaped.
 * Also takes into account if you have the splitsymbol at the start and e.g `'  '` converts to  `['', '', '']` and `' a "b c" d '` converts to `['', 'a', 'b c', 'd', '']`
 * Given an input string like `a "b c" d` with a space character as split this splits the arguments similar to common shell interpreters (i.e., `a`, `b c`, and `d`).
 *
 * @param inputString - The string to split
 * @param split       - The **single** character to split on (can not be the backslash or quote)
 */
export function splitAtEscapeSensitiveWithEmptyParameters(inputString: string, split = ' '): string[] {
	const args = []
	let current = ''
	let inQuotes = false
	let escaped = false

	for(const c of inputString) {
		if(escaped) {
			escaped = false
			switch(c) {
				case 'n': current += '\n'; break
				case 't': current += '\t'; break
				case 'r': current += '\r'; break
				case 'v': current += '\v'; break
				case 'f': current += '\f'; break
				case 'b': current += '\b'; break
				default: current += c
			}
		} else if(c === split && !inQuotes) {
			args.push(current)
			current = ''
		} else if(c === '"' || c === "'") {
			inQuotes = !inQuotes
		} else if(c === '\\') {
			escaped = true
		} else {
			current += c
		}
	}

	if(current !== '') {
		args.push(current)
	}
	
	if(inputString.slice(-1) === ' '){
		args.push('')
	}
	
	return args
}