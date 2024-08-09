export function bigint2number(a: bigint | string): number {
	// we have to remove the trailing `n`
	return Number(String(a).slice(0, -1))
}
