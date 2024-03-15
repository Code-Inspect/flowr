import type {
	IEnvironment,
	REnvironmentInformation
} from './environment'
import {
	BuiltInEnvironment
} from './environment'
import { dataflowLogger } from '../index'
import { expensiveTrace } from '../../util/log'
import type { Ternary } from '../../util/logic'
import type { Identifier, IdentifierDefinition } from './identifier'

/**
 * Resolves a given identifier name to a list of its possible definition location using R scoping and resolving rules.
 *
 * @param name         - The name of the identifier to resolve
 * @param environment  - The current environment used for name resolution
 *
 * @returns A list of possible definitions of the identifier (one if the definition location is exactly and always known), or `undefined` if the identifier is undefined in the current scope/with the current environment information.
 */
// TODO: optimize this to just have a hash-map updated on scope change but flattened in a single map
export function resolveByName(name: Identifier, environment: REnvironmentInformation): IdentifierDefinition[] | undefined {
	expensiveTrace(dataflowLogger, () => `Resolving local identifier ${name} (local stack size: ${environment.level})`)

	let current: IEnvironment = environment.current
	do{
		const definition = current.memory.get(name)
		if(definition !== undefined) {
			return definition
		}
		current = current.parent
	} while(current.id !== BuiltInEnvironment.id)

	dataflowLogger.trace(`Unable to find identifier ${name} in stack, can be built-in`)
	return current.memory.get(name)
}

export function resolvesToBuiltInConstant(name: Identifier | undefined, environment: REnvironmentInformation, wantedValue: unknown): Ternary {
	if(name === undefined) {
		return 'never'
	}
	const definition = resolveByName(name, environment)

	if(definition === undefined) {
		return 'never'
	}

	let all = true
	let some = false
	for(const def of definition) {
		if(def.kind === 'built-in-value' && def.value === wantedValue) {
			some = true
		} else {
			all = false
		}
	}

	if(all) {
		return 'always'
	} else {
		return some ? 'maybe' : 'never'
	}
}
