import type { REnvironmentInformation } from './environment'
import { Environment } from './environment'
import { guard } from '../../util/assert'

/** Add a new local environment scope to the stack, returns the modified variant - sharing the original environments in the stack (no deep-clone) */
export function pushLocalEnvironment(base: REnvironmentInformation): REnvironmentInformation {
	return {
		current: new Environment('local', base.current),
		level:   base.level + 1
	}
}

export function popLocalEnvironment(base: REnvironmentInformation): REnvironmentInformation {
	guard(base.level > 0, 'cannot remove the global/root environment')
	const parent = base.current.parent
	guard(parent !== undefined, 'level is wrong, parent is undefined even though level suggested depth > 0 (starts with 0)')
	return {
		current: parent,
		level:   base.level - 1
	}
}
