import type { SourceRange } from '../../../../util/range'
import type { RType } from './type'
import type { MergeableRecord } from '../../../../util/objects'
import type { RNa, RNull } from '../../values'
import type {
	RExpressionList,
	RNumber,
	RSymbol,
	RLogical,
	RString,
	RBinaryOp,
	RUnaryOp,
	RIfThenElse,
	RParameter,
	RFunctionDefinition,
	RRepeatLoop,
	RForLoop,
	RWhileLoop,
	RComment,
	RFunctionCall,
	RBreak,
	RNext,
	RArgument,
	RNamedAccess,
	RIndexAccess,
	RLineDirective,
	RPipe
} from './nodes'
import type { OtherInfoNode } from './nodes/info'

/** Simply an empty interface used to say that there are additional decorations (see {@link Base}). */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NoInfo {
}

/**
 * Will be used to reconstruct the source of the given element in the R-ast.
 * This will not be part of most comparisons as it is mainly of interest to the reconstruction of R code.
 */
interface Source {
	/**
   * The range is different from the assigned {@link Location} as it refers to the complete source range covered by the given
   * element.
   * <p>
   * As an example for the difference, consider a for loop, the location of `for` will be just the three characters,
   * but the *range* will be everything including the loop body.
   */
	fullRange?:        SourceRange
	/**
   * Similar to {@link Source.fullRange} this contains the complete R lexeme of the given element.
   */
	fullLexeme?:       string
	/**
	 * This may contain additional elements that were part of the original R code, but are not part of the normalized R-ast.
	 * This allows inline-comments!
	 */
	additionalTokens?: OtherInfoNode[]
}

/**
 * Provides the common base of all {@link RNode | RNodes}.
 *
 * @typeParam Info       - can be used to store additional information about the node
 * @typeParam LexemeType - the type of the lexeme, probably always a `string` or `string | undefined`
 */
export interface Base<Info, LexemeType = string> extends MergeableRecord {
	type:   RType
	/** the original string retrieved from R, can be used for further identification */
	lexeme: LexemeType
	/** allows to attach additional information to the node */
	info:   Info & Source
}

export interface WithChildren<Info, Children extends Base<Info, string | undefined>> {
	children: Children[]
}

/**
 * A helper interface we use to "mark" leaf nodes.
 * <p>
 * Please be aware, that this is not marking from a language perspective,
 * as it is equivalent to the {@link Base} interface.
 * It is intended to help humans understand the code.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Leaf<Info = NoInfo, LexemeType = string> extends Base<Info, LexemeType> {

}

/**
 * Indicates, that the respective {@link Base} node has known source code
 * location information.
 */
export interface Location {
	/**
	 * The location may differ from what is stated in {@link Source#fullRange} as it
	 * represents the location identified by the R parser.
	 *
	 * @see Source#fullRange
	 */
	location: SourceRange
}

/**
 * Represents the type of namespaces in the R programming language.
 * At the moment, this is only the name of the namespace.
 */
export type NamespaceIdentifier = string

/**
 * Similar to {@link Location} this is an interface that indicates that
 * the respective {@link Base} node has a respective property (a namespace).
 */
export interface Namespace {
	/**
	 * The namespace attached to the given node
	 * (e.g., a namespaced symbol in `x::y`).
	 */
	namespace: NamespaceIdentifier | undefined
}


/**
 * This subtype of {@link RNode} represents all types of constants
 * represented in the normalized AST.
 */
export type RConstant<Info>       = RNumber<Info> | RString<Info> | RLogical<Info> | RSymbol<Info, typeof RNull | typeof RNa>
/**
 * This subtype of {@link RNode} represents all types of {@link Leaf} nodes in the
 * normalized AST.
 */
export type RSingleNode<Info>     = RComment<Info> | RSymbol<Info> | RConstant<Info> | RBreak<Info> | RNext<Info> | RLineDirective<Info>
/**
 * This subtype of {@link RNode} represents all looping constructs in the normalized AST.
 */
export type RLoopConstructs<Info> = RForLoop<Info> | RRepeatLoop<Info> | RWhileLoop<Info>
/**
 * As an extension to {@link RLoopConstructs}, this subtype of {@link RNode} includes
 * the {@link RIfThenElse} construct as well.
 */
export type RConstructs<Info>     = RLoopConstructs<Info> | RIfThenElse<Info>
/**
 * This subtype of {@link RNode} represents all types related to functions
 * (calls and definitions) in the normalized AST.
 */
export type RFunctions<Info>      = RFunctionDefinition<Info> | RFunctionCall<Info> | RParameter<Info> | RArgument<Info>
/**
 * This subtype of {@link RNode} represents all types of otherwise hard to categorize
 * nodes in the normalized AST. At the moment these are the comment-like nodes.
 */
export type ROther<Info>          = RComment<Info> | RLineDirective<Info>

/**
 * The `RNode` type is the union of all possible nodes in the R-ast.
 * It should be used whenever you either not care what kind of
 * node you are dealing with or if you want to handle all possible nodes.
 * <p>
 *
 * All other subtypes (like {@link RLoopConstructs}) listed above
 * can be used to restrict the kind of node. They do not have to be
 * exclusive, some nodes can appear in multiple subtypes.
 */
export type RNode<Info = NoInfo>  = RExpressionList<Info> | RFunctions<Info>
| ROther<Info> | RConstructs<Info> | RNamedAccess<Info> | RIndexAccess<Info>
| RUnaryOp<Info> | RBinaryOp<Info> | RSingleNode<Info>  | RPipe<Info>
