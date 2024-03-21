import type { IdentifierDefinition, IEnvironment, REnvironmentInformation } from './environment'
import { cloneEnvironments } from './environment'
import type { DataflowScopeName } from './scopes'
import { GlobalScope, LocalScope } from './scopes'
import { guard } from '../../util/assert'

/**
 * Insert the given `definition` --- defined within the given scope --- into the passed along `environments` will take care of propagation.
 * Does not modify the passed along `environments` in-place! It returns the new reference.
 */
export function define(definition: IdentifierDefinition, withinScope: DataflowScopeName, environments: REnvironmentInformation): REnvironmentInformation {
	let newEnvironments = environments
	guard(withinScope === definition.scope, 'Mismatching scopes')
	if(withinScope === LocalScope) {
		newEnvironments = cloneEnvironments(environments, false)
		newEnvironments.current.memory.set(definition.name, [definition])
	} else if(withinScope === GlobalScope) {
		newEnvironments = cloneEnvironments(environments, true)
		let current: IEnvironment | undefined = newEnvironments.current
		let last = undefined
		let found = false
		do{
			if(current.memory.has(definition.name)) {
				current.memory.set(definition.name, [definition])
				found = true
				break
			}
			last = current
			current = current.parent
		} while(current !== undefined)
		if(!found) {
			guard(last !== undefined, () => `Could not find global scope for ${definition.name}`)
			last.memory.set(definition.name, [definition])
		}
	}
	return newEnvironments
}
