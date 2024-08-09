import type { NodeId } from '../../r-bridge/lang-4.x/ast/model/processing/node-id'
import type { REnvironmentInformation } from '../../dataflow/environments/environment'
import type { DecodedCriteria } from '../criterion/parse'


/**
 * Represents a node during the slicing process, together with the environment it is traversed in
 * (modified by function calls) and whether it is only used for its side effects.
 */
export interface NodeToSlice {
	readonly id:                 NodeId
	/** used for calling context, etc. */
	readonly baseEnvironment:    REnvironmentInformation
	/** if we add a function call, we may need it only for its side effects (e.g., a redefinition of a global variable), if so, 'returns' links will not be traced */
	readonly onlyForSideEffects: boolean
}

/**
 * The result of the slice step
 */
export interface SliceResult {
	/**
	 * Number of times the set threshold was hit (i.e., the same node was visited too often).
	 * While any number above 0 might indicate a wrong slice, it does not have to as usually even revisiting the same node
	 * seldom causes more ids to be included in the slice.
	 */
	readonly timesHitThreshold: number
	/**
	 * The ids of the nodes in the normalized ast that are part of the slice.
	 */
	readonly result:            ReadonlySet<NodeId>
	/**
	 * The mapping produced to decode the entered criteria
	 */
	readonly decodedCriteria:   DecodedCriteria
}
