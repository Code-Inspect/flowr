import type { Identifier, IdentifierDefinition, IEnvironment, REnvironmentInformation } from './environment'
import { dataflowLogger } from '../index'
import type { DataflowScopeName } from './scopes'
import { LocalScope } from './scopes'

/**
 * Resolves a given identifier name to a list of its possible definition location using R scoping and resolving rules.
 *
 * @param name - The name of the identifier to resolve
 * @param withinScope - The scope in which the identifier is used
 * @param environments - The current environments used for name resolution
 *
 * @returns A list of possible definitions of the identifier (one if the definition location is exactly and always known), or `undefined` if the identifier is undefined in the current scope/with the current environment information.
 */
export function resolveByName(name: Identifier, withinScope: DataflowScopeName, environments: REnvironmentInformation): IdentifierDefinition[] | undefined {
	if(withinScope !== LocalScope) {
		throw new Error('Non-local scoping is not yet supported')
	}
	return resolve(name, withinScope, environments)
}

function resolve(name: Identifier, withinScope: DataflowScopeName, environments: REnvironmentInformation) {
	dataflowLogger.trace(`Resolving local identifier ${name} (scope name: ${withinScope}, local stack size: ${environments.level})`)

	let current: IEnvironment | undefined = environments.current
	do{
		const definition = current.memory.get(name)
		if(definition !== undefined) {
			return definition
		}
		current = current.parent
	} while(current !== undefined)

	dataflowLogger.trace(`Unable to find identifier ${name} in stack`)
	return undefined
}
