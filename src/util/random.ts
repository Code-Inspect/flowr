import { guard } from './assert'

export const ALPHABET_LOWERCASE = [...'abcdefghijklmnopqrstuvwxyz'] as const
export const ALPHABET_UPPERCASE = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'] as const
export const ALPHABET = [...ALPHABET_LOWERCASE, ...ALPHABET_UPPERCASE] as const

// we could do this with type guards etc. but this way it is easier to read I guess
function isPositiveFiniteInteger(length: number): boolean {
	return isFinite(length) && length >= 0 && length === Math.floor(length)
}

export function randomString(length: number, symbols = ALPHABET): string {
	guard(isPositiveFiniteInteger(length), `length must be a positive, finite integer (${length} >= 0)`)
	guard(symbols.length > 0, 'there must be at least one symbol to use')

	let result = ''
	for(let i = 0; i < length; i++) {
		result += symbols[Math.floor(Math.random() * symbols.length)]
	}
	return result
}
