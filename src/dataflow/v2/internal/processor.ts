/**
 * Based on a two-way fold, this processor will automatically supply scope information
 */
import type {
	NoInfo,
	NormalizedAst,
	ParentInformation, RConstant,
	RExpressionList, RFunctions,
	RNode,
	RNodeWithParent, ROther,
	RParseRequest
} from '../../../r-bridge'
import type { REnvironmentInformation } from '../../common/environments'
import type { DataflowInformation } from '../../common/info'

export interface DataflowProcessorInformation<OtherInfo> {
	/**
   * Initial and frozen ast-information
   */
	readonly completeAst:    NormalizedAst<OtherInfo>
	/**
   * Correctly contains pushed local scopes introduced by `function` scopes.
   * Will by default *not* contain any symbol-bindings introduces along the way, they have to be decorated when moving up the tree.
   */
	readonly environments:   REnvironmentInformation
	/**
   * Other processors to be called by the given functions
   */
	readonly processors:     DataflowProcessors<OtherInfo>
	/**
	 * The {@link RParseRequest} that is currently being parsed
	 */
	readonly currentRequest: RParseRequest
	/**
	 * The chain of {@link RParseRequest} fingerprints ({@link requestFingerprint}) that lead to the {@link currentRequest}.
	 * The most recent (last) entry is expected to always be the {@link currentRequest}.
	 */
	readonly referenceChain: string[]
}

export type DataflowProcessor<OtherInfo, NodeType extends RNodeWithParent<OtherInfo>> = (node: NodeType, data: DataflowProcessorInformation<OtherInfo>) => DataflowInformation

type NodeWithKey<OtherInfo, Node extends RNode<OtherInfo & ParentInformation>, TypeKey> = Node['type'] extends TypeKey ? Node : never

export type RNodeV2<Info = NoInfo>  = RExpressionList<Info> | RFunctions<Info> | RConstant<Info> | ROther<Info>

/**
 * This way, a processor mapped to a {@link RType#Symbol} require a {@link RSymbol} as first parameter and so on.
 */
export type DataflowProcessors<OtherInfo> = {
	[key in RNodeV2['type']]: DataflowProcessor<OtherInfo, NodeWithKey<OtherInfo, RNodeV2<OtherInfo & ParentInformation>, key>>
}

/**
 * Originally, dataflow processor was written as a two-way fold, but this produced problems when trying to resolve function calls
 * which require information regarding the calling *and* definition context. While this only is a problem for late bindings as they happen
 * with functions (and probably quote'd R-expressions) it is still a problem that must be dealt with.
 * Therefore, the dataflow processor has no complete control over the traversal and merge strategy of the graph, with each processor being in
 * the position to call the other processors as needed for its children.
 * <p>
 * Now this method can be called recursively within the other processors to parse the dataflow for nodes that you can not narrow down.
 *
 * @param current - The current node to start processing from
 * @param data    - The initial information to be passed down
 */
export function processDataflowFor<OtherInfo>(current: RNodeV2<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo & ParentInformation>): DataflowInformation {
	return data.processors[current.type](current as never, data)
}
