import type {
	Identifier,
	IdentifierDefinition,
	IEnvironment,
	REnvironmentInformation
} from './environment'
import {
	BuiltInEnvironment,
	Environment
} from './environment'

function cloneEnvironment(environment: IEnvironment, recurseParents: boolean): IEnvironment
function cloneEnvironment(environment: IEnvironment | undefined, recurseParents: boolean): IEnvironment | undefined {
	if(environment === undefined) {
		return undefined
	} else if(environment.id === BuiltInEnvironment.id) {
		return BuiltInEnvironment
	}
	const clone = new Environment(environment.name, recurseParents ? cloneEnvironment(environment.parent, recurseParents) : environment.parent)
	clone.memory = new Map(JSON.parse(JSON.stringify([...environment.memory])) as [Identifier, IdentifierDefinition[]][])
	return clone
}

export function cloneEnvironmentInformation(environment: REnvironmentInformation, recurseParents = true): REnvironmentInformation {
	return {
		current: cloneEnvironment(environment.current, recurseParents),
		level:   environment.level
	}
}
