/**
 * Sometimes we want to know all possible slicing criteria (obeying some filter).
 * This module provides a function to collect all slicing criteria.
 * @module
 */
import type { MergeableRecord } from '../../util/objects'
import type {
	NodeId,
	RNodeWithParent
} from '../../r-bridge'
import type { SingleSlicingCriterion, SlicingCriteria } from './parse'
import { guard } from '../../util/assert'
import { getUniqueCombinationsOfSize } from '../../util/arrays'

/**
 * Defines the filter for collecting all possible slicing criteria.
 * @see DefaultAllVariablesFilter
 */
export interface SlicingCriteriaFilter extends MergeableRecord {
	/**
   * Inclusive minimum size of the slicing criteria (number of included slice points).
   * Should be at least `1` to make sense (and of course at most {@link SlicingCriteriaFilter#maximumSize | maximum size}).
   */
	minimumSize: number
	/**
   * Inclusive maximum size of the slicing criteria (number of included slice points).
   * Should be at least `1` to make sense (and of course at least {@link SlicingCriteriaFilter#minimumSize | minimum size}).
   * <p>
   * Be really careful with this one, as the number of possible slicing criteria can grow exponentially with the maximum size.
   */
	maximumSize: number
	/**
   * Function that determines the ids of all nodes that can be used as slicing criteria.
   */
	collectAll:  (root: RNodeWithParent) => NodeId[]
}

/**
 * Will create all possible slicing criteria for the given ast, based on the {@link SlicingCriteriaFilter}.
 * The slicing criteria will be *ordered* (i.e., it will not return `[1:2,3:4]` and `[3:4,1:2]` if `maximumSize` \> 1).
 * If there are not enough matching nodes within the ast, this will return *no* slicing criteria!
 */
export function* collectAllSlicingCriteria<OtherInfo>(ast: RNodeWithParent<OtherInfo>, filter: Readonly<SlicingCriteriaFilter>): Generator<SlicingCriteria, void, void> {
	guard(filter.minimumSize >= 1, `Minimum size must be at least 1, but was ${filter.minimumSize}`)
	guard(filter.maximumSize >= filter.minimumSize, `Maximum size must be at least minimum size, but was ${filter.maximumSize} < ${filter.minimumSize}`)
	const potentialSlicingNodes = filter.collectAll(ast)

	if(potentialSlicingNodes.length < filter.minimumSize) {
		return
	}

	for(const combination of getUniqueCombinationsOfSize(potentialSlicingNodes, filter.minimumSize, filter.maximumSize)) {
		yield combination.map(n => `$${n}` as SingleSlicingCriterion)
	}
}
