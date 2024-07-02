import type { AstIdMap } from './decorate'

/** The type of the id assigned to each node. Branded to avoid problematic usages with other string or numeric types. */
export type NodeId<T extends string | number = string | number> = T & { __brand?: 'node-id' };
const numIdRegex = /^\d+$/

/** used so that we do not have to store strings for the default numeric ids */
export function normalizeIdToNumberIfPossible(id: NodeId): NodeId {
	// check if string is number
	if(typeof id === 'string' && numIdRegex.test(id)) {
		return Number(id)
	}
	return id
}

export function recoverName(id: NodeId, idMap?: AstIdMap): string | undefined {
	return idMap?.get(id)?.lexeme
}
