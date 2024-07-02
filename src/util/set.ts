/**
 * Given both sets, this checks if they contain the same elements.
 */
export function setEquals<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
	if(a.size !== b.size) {
		return false
	}
	for(const item of a) {
		if(!b.has(item)) {
			return false
		}
	}
	return true
}

/**
 * Returns `A – B`
 */
export function setMinus<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): Set<T> {
	const result = new Set<T>()
	for(const item of a) {
		if(!b.has(item)) {
			result.add(item)
		}
	}
	return result
}
