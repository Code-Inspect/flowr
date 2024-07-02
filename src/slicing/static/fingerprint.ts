import objectHash from 'object-hash'
import type { REnvironmentInformation } from '../../dataflow/environments/environment'
import { BuiltInEnvironment } from '../../dataflow/environments/environment'
import type { NodeId } from '../../r-bridge/lang-4.x/ast/model/processing/node-id'
import { EmptyBuiltInMemory } from '../../dataflow/environments/built-in'

export type Fingerprint = string

export function envFingerprint(env: REnvironmentInformation): Fingerprint {
	return objectHash(env, { excludeKeys: key => key === 'id', replacer: (v: unknown) => (v === BuiltInEnvironment || v === EmptyBuiltInMemory) ? undefined : v })
}

export function fingerprint(id: NodeId, envFingerprint: Fingerprint, onlyForSideEffects: boolean): Fingerprint {
	return `${id}-${envFingerprint}-${onlyForSideEffects ? '0' : '1'}`
}
