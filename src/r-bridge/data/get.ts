import { guard } from '../../util/assert'
import type { FlowrCapability } from './types'
import { flowrCapabilities } from './data'


type CapabilityIdFilter<T extends FlowrCapability, Filter> = T extends Filter ? T['id'] : never

/** Recursively extract all valid identifiers (which have the given support predicate) */
type ExtractAllIds<T extends FlowrCapability, Filter = FlowrCapability> =
	T extends { readonly capabilities: infer U }
		? U extends readonly FlowrCapability[]
			? (CapabilityIdFilter<T, Filter> | ExtractAllIds<U[number]>)
			: CapabilityIdFilter<T, Filter>
		: CapabilityIdFilter<T, Filter>

type Capabilities = (typeof flowrCapabilities)['capabilities'][number]
export type FlowrCapabilityId = ExtractAllIds<Capabilities>
export type SupportedFlowrCapabilityId = ExtractAllIds<Capabilities, { readonly supported: 'partially' | 'fully' }>

type PathToCapability = readonly number[]

export interface FlowrCapabilityWithPath extends FlowrCapability{
	path: PathToCapability
}

function search(id: FlowrCapabilityId, capabilities: readonly FlowrCapability[], path: number[] = []): FlowrCapabilityWithPath | undefined {
	let idx = 0
	for(const capability of capabilities) {
		idx++ // index by one :)
		if(capability.id === id) {
			return { ...capability, path: [...path, idx] }
		}
		if(capability.capabilities) {
			const found = search(id, capability.capabilities, [...path, idx])
			if(found) {
				return found
			}
		}
	}
	return undefined
}

const capabilityCache = new Map<FlowrCapabilityId, FlowrCapabilityWithPath>()

export function getCapabilityById(id: FlowrCapabilityId): FlowrCapabilityWithPath {
	const cached = capabilityCache.get(id)
	if(cached) {
		return cached
	}
	const value = search(id, flowrCapabilities.capabilities)
	guard(value !== undefined, () => `Could not find capability with id ${id}`)
	capabilityCache.set(id, value)
	return value
}

export function getAllCapabilities(): readonly FlowrCapabilityWithPath[] {
	const result: FlowrCapabilityWithPath[] = []
	function traverse(capabilities: readonly FlowrCapability[], currentPath: PathToCapability = []) {
		let idx = 0
		for(const capability of capabilities) {
			idx++
			const nextPath = [...currentPath, idx]
			result.push({ ...capability, path: nextPath })
			if(capability.capabilities) {
				traverse(capability.capabilities, nextPath)
			}
		}
	}
	traverse(flowrCapabilities.capabilities, [])
	return result
}

