/**
 * Check if the given string starts and ends with the given letter
 */
export function startAndEndsWith(str: string, letter: string): boolean {
	return str.startsWith(letter) && str.endsWith(letter)
}

/**
 * Removes all whitespace in the given string
 */
export function withoutWhitespace(output: string): string {
	return output.replace(/\s/g,'')
}

/**
 * Find the longest common prefix in an array of strings
 */
export function longestCommonPrefix(strings: string[]): string {
	if(strings.length === 0) {
		return ''
	}

	let prefix = strings[0]

	for(const str of strings) {
		if(prefix.length === 0) {
			break
		}
		let i = 0
		while(i < prefix.length && prefix[i] === str[i]) {
			i++
		}
		if(i !== prefix.length) {
			prefix = prefix.slice(0, i)
		}
	}

	return prefix
}
