import type { DeepPartial, DeepRequired } from 'ts-essentials'
import { jsonReplacer } from './json'

/**
 * checks if `item` is an object (it may be an array, ...)
 */
export function isObjectOrArray(item: unknown): boolean {
	return typeof item === 'object'
}

export type MergeableRecord = Record<string, unknown>
export type MergeableArray = unknown[]
export type Mergeable = MergeableRecord | MergeableArray

/**
 * Given two objects deeply merges them, if an object is an array it will merge the array values!
 * Guarantees some type safety by requiring objects to merge to be from the same type (allows undefined)
 */
export function deepMergeObject<T extends Mergeable>(base: Required<T>, addon?: T): Required<T>
export function deepMergeObject<T extends Mergeable>(base: DeepRequired<T>, addon?: T): DeepRequired<T>
export function deepMergeObject<T extends Mergeable>(base: T, addon?: DeepPartial<T> | Partial<T>): T
export function deepMergeObject(base: Mergeable, addon: Mergeable): Mergeable
export function deepMergeObject(base?: Mergeable, addon?: Mergeable): Mergeable | undefined
export function deepMergeObject(base?: Mergeable, addon?: Mergeable): Mergeable | undefined {
	if(!base) {
		return addon
	} else if(!addon) {
		return base
	} else if(typeof base !== 'object' || typeof addon !== 'object') {
		// this case should be guarded by type guards, but in case we do not know
		throw new Error('illegal types for deepMergeObject!')
	}

	assertSameType(base, addon)

	const result: MergeableRecord = { ...base }

	const baseIsArray = Array.isArray(base)
	const addonIsArray = Array.isArray(addon)

	if(!baseIsArray && !addonIsArray) {
		deepMergeObjectWithResult(addon, base, result)
	} else if(baseIsArray && addonIsArray) {
		return [...base, ...addon]
	} else {
		throw new Error('cannot merge object with array!')
	}

	return result
}

function deepMergeObjectWithResult(addon: MergeableRecord, base: MergeableRecord, result: MergeableRecord): void {
	for(const key of Object.keys(addon)) {
		if(typeof addon[key] === 'object') {
			if(key in base) {
				result[key] = deepMergeObject(base[key] as Mergeable, addon[key] as Mergeable)
			} else {
				result[key] = addon[key]
			}
		} else {
			assertSameType(result[key], addon[key])
			result[key] = addon[key]
		}
	}
}

function assertSameType(base: unknown, addon: unknown): void {
	if(base !== undefined && addon !== undefined && typeof base !== typeof addon) {
		throw new Error(`cannot merge different types! ${typeof base} (${JSON.stringify(base, jsonReplacer)}) !== ${typeof addon} (${JSON.stringify(addon, jsonReplacer)})`)
	}
}
