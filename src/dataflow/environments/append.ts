import { guard } from '../../util/assert'
import { REnvironmentInformation, IEnvironment, IdentifierDefinition, Environment } from './environment'

function uniqueMergeValues(old: IdentifierDefinition[], value: IdentifierDefinition[]): IdentifierDefinition[] {
  const result = old
  for (const v of value) {
    const find = result.findIndex(o => o.nodeId === v.nodeId && o.definedAt === v.definedAt)
    if(find < 0) {
      result.push(v)
    }
  }
  return result
}

function appendIEnvironmentWith(base: IEnvironment | undefined, next: IEnvironment | undefined): IEnvironment {
  guard(base !== undefined && next !== undefined, 'can not append environments with undefined')
  guard(base.name === next.name, 'cannot overwrite environments with different names')
  const map = new Map(base.memory)
  for (const [key, value] of next.memory) {
    const old = map.get(key)
    if(old) {
      map.set(key, uniqueMergeValues(old, value))
    } else {
      map.set(key, value)
    }
  }

  const parent = base.parent === undefined ? undefined : appendIEnvironmentWith(base.parent, next.parent)

  const out = new Environment(base.name, parent)
  out.memory = map
  return out
}


// TODO if we have something like x && (y <- 13) we still have to track the y assignment as maybe... or?
/**
 * Adds all writes of `next` to `base` (i.e., the operations of `next` *might* happen).
 */
export function appendEnvironments(base: REnvironmentInformation, next: REnvironmentInformation | undefined): REnvironmentInformation
export function appendEnvironments(base: REnvironmentInformation | undefined, next: REnvironmentInformation): REnvironmentInformation
export function appendEnvironments(base: undefined, next: undefined): undefined
export function appendEnvironments(base: REnvironmentInformation | undefined, next: REnvironmentInformation | undefined): REnvironmentInformation | undefined
export function appendEnvironments(base: REnvironmentInformation | undefined, next: REnvironmentInformation | undefined): REnvironmentInformation | undefined {
  if(base === undefined) {
    return next
  } else if(next === undefined) {
    return base
  }
  guard(base.level === next.level, "TODO; deal with the case if they differ")

  return {
    current: appendIEnvironmentWith(base.current, next.current),
    level:   base.level,
  }
}
