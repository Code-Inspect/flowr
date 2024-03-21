import { guard } from '../../util/assert'
import type { REnvironmentInformation, IEnvironment, IdentifierDefinition } from './environment'
import { Environment } from './environment'

function anyIsMaybeGuardingSame(values: IdentifierDefinition[]): boolean {
	if(values.length === 0) {
		return true
	}
	const attr = values[0].used
	if(attr === 'maybe') {
		return true
	}
	let same = true
	for(let i = 1; i < values.length; i++) {
		const used = values[i].used
		if(used === 'maybe') {
			return true
		}
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- in case we want to add more attributes in the future
		if(used !== attr) {
			same = false
		}
	}
	if(!same) {
		throw new Error('all values must have either a maybe or are all the same')
	}
	return false
}

export function overwriteIEnvironmentWith(base: IEnvironment | undefined, next: IEnvironment | undefined, includeParent = true): IEnvironment {
	guard(base !== undefined && next !== undefined, 'can not overwrite environments with undefined')
	guard(base.name === next.name, 'cannot overwrite environments with different names')
	const map = new Map(base.memory)
	for(const [key, values] of next.memory) {
		const hasMaybe = anyIsMaybeGuardingSame(values)
		if(hasMaybe) {
			const old = map.get(key)
			// we need to make a copy to avoid side effects for old reference in other environments
			const updatedOld: IdentifierDefinition[] = old ?? []
			for(const v of values) {
				const index = updatedOld.findIndex(o => o.nodeId === v.nodeId && o.definedAt === v.definedAt)
				if(index < 0) {
					updatedOld.push(v)
				}
			}
			map.set(key, [...updatedOld])
		} else {
			map.set(key, values)
		}
	}

	let parent: IEnvironment | undefined
	if(includeParent) {
		parent = base.parent === undefined ? undefined : overwriteIEnvironmentWith(base.parent, next.parent)
	} else {
		parent = base.parent
	}

	const out = new Environment(base.name, parent)
	out.memory = map
	return out
}


export function overwriteEnvironments(base: REnvironmentInformation, next: REnvironmentInformation | undefined): REnvironmentInformation
export function overwriteEnvironments(base: REnvironmentInformation | undefined, next: REnvironmentInformation): REnvironmentInformation
export function overwriteEnvironments(base: undefined, next: undefined): undefined
export function overwriteEnvironments(base: REnvironmentInformation | undefined, next: REnvironmentInformation | undefined): REnvironmentInformation | undefined
/**
 * Assumes, that all definitions within next replace those within base (given the same name).
 * <b>But</b> if all definitions within next are maybe, then they are appended to the base definitions (updating them to be `maybe` from now on as well), similar to {@link appendEnvironments}.
 */
export function overwriteEnvironments(base: REnvironmentInformation | undefined, next: REnvironmentInformation | undefined): REnvironmentInformation | undefined {
	if(base === undefined) {
		return next
	} else if(next === undefined) {
		return base
	}
	guard(next.level === base.level, `cannot overwrite environments with differently nested local scopes, base ${base.level} vs. next ${next.level}. This should not happen.`)

	return {
		current: overwriteIEnvironmentWith(base.current, next.current),
		level:   base.level
	}
}
