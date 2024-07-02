import { guard } from '../../util/assert'
import type { REnvironmentInformation, IEnvironment } from './environment'
import { Environment, BuiltInEnvironment } from './environment'
import type { IdentifierDefinition } from './identifier'

function uniqueMergeValues(old: IdentifierDefinition[], value: readonly IdentifierDefinition[]): IdentifierDefinition[] {
	const result = old
	for(const v of value) {
		const find = result.findIndex(o => o.nodeId === v.nodeId && o.definedAt === v.definedAt)
		if(find < 0) {
			result.push(v)
		}
	}
	return result
}

function appendIEnvironmentWith(base: IEnvironment | undefined, next: IEnvironment | undefined): IEnvironment {
	guard(base !== undefined && next !== undefined, 'can not append environments with undefined')
	const map = new Map(base.memory)
	for(const [key, value] of next.memory) {
		const old = map.get(key)
		if(old) {
			map.set(key, uniqueMergeValues(old, value))
		} else {
			map.set(key, value)
		}
	}

	const parent = base.parent === BuiltInEnvironment ? BuiltInEnvironment : appendIEnvironmentWith(base.parent, next.parent)

	const out = new Environment(parent)
	out.memory = map
	return out
}


/**
 * Adds all writes of `next` to `base` (i.e., the operations of `next` *might* happen).
 */
export function appendEnvironment(base: REnvironmentInformation, next: REnvironmentInformation | undefined): REnvironmentInformation
export function appendEnvironment(base: REnvironmentInformation | undefined, next: REnvironmentInformation): REnvironmentInformation
export function appendEnvironment(base: undefined, next: undefined): undefined
export function appendEnvironment(base: REnvironmentInformation | undefined, next: REnvironmentInformation | undefined): REnvironmentInformation | undefined
export function appendEnvironment(base: REnvironmentInformation | undefined, next: REnvironmentInformation | undefined): REnvironmentInformation | undefined {
	if(base === undefined) {
		return next
	} else if(next === undefined) {
		return base
	}
	guard(base.level === next.level, 'environments must have the same level to be handled, it is up to the caller to ensure that')

	return {
		current: appendIEnvironmentWith(base.current, next.current),
		level:   base.level,
	}
}
