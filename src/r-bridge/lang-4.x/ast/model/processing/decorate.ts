/**
 * The decoration module is tasked with taking an R-ast given by a {@link RNode} and
 *
 * 1. assigning a unique id to each node (see {@link IdGenerator})
 * 2. transforming the AST into a doubly linked tree using the ids (so it stays serializable)
 *
 * The main entry point is {@link decorateAst}.
 *
 * @module
 */

import type { NoInfo, RNode } from '../model'
import { guard } from '../../../../../util/assert'
import type { SourceRange } from '../../../../../util/range'
import { BiMap } from '../../../../../util/bimap'
import type { MergeableRecord } from '../../../../../util/objects'
import { RoleInParent } from './role'
import { RType } from '../type'
import { foldAstStateful } from './stateful-fold'
import type { NodeId } from './node-id'
import type { RDelimiter } from '../nodes/info/r-delimiter'
import type { RBinaryOp } from '../nodes/r-binary-op'
import type { RPipe } from '../nodes/r-pipe'
import type { RFunctionCall, RNamedFunctionCall, RUnnamedFunctionCall } from '../nodes/r-function-call'
import { EmptyArgument } from '../nodes/r-function-call'
import type { RExpressionList } from '../nodes/r-expression-list'
import type { RParameter } from '../nodes/r-parameter'
import type { RArgument } from '../nodes/r-argument'

/**
 * A function that given an RNode returns a (guaranteed) unique id for it
 * @param data - the node to generate an id for
 *
 * @returns a unique id for the given node
 */
export type IdGenerator<OtherInfo> = (data: RNode<OtherInfo>) => NodeId

/**
 * The simplest id generator which just increments a number on each call.
 */
export function deterministicCountingIdGenerator(id = 0): () => NodeId {
	return () => id++
}

export function sourcedDeterministicCountingIdGenerator(path: string, location: SourceRange, start = 0): () => NodeId {
	let id = start
	return () => `${path}-${loc2Id(location)}-${id++}`
}

function loc2Id([sl,sc,el,ec]: SourceRange): string {
	return `${sl}:${sc}-${el}:${ec}`
}

/**
 * Generates the location id, used by {@link deterministicLocationIdGenerator}.
 *
 * @param data - the node to generate an id for, must have location information
 */
export function nodeToLocationId<OtherInfo>(data: RNode<OtherInfo> | RDelimiter): NodeId {
	const loc = data.location
	guard(loc !== undefined, 'location must be defined to generate a location id')
	return loc2Id(loc)
}

/**
 * Generates unique ids based on the locations of the node (see {@link nodeToLocationId}).
 * If a node has no location information, it will be assigned a unique counter-value.
 *
 * @param start - the start value for the counter, in case nodes do not have location information
 */
export function deterministicLocationIdGenerator<OtherInfo>(start = 0): IdGenerator<OtherInfo> {
	let id = start
	return (data: RNode<OtherInfo>) => data.location !== undefined ? nodeToLocationId(data) : `${id++}`
}

export interface ParentContextInfo extends MergeableRecord {
	role:  RoleInParent
	/**
	 * The depth of the node in the AST
	 *
	 * The root node has a depth of 0, its children a depth of 1, and so on.
	 */
	depth: number
	/**
	 * 0-based index of the child in the parent (code semantics, e.g., for an if-then-else, the condition will be 0, the then-case will be 1, ...)
	 *
	 * The index is adaptive, that means that if the name of an argument exists, it will have index 0, and the value will have index 1.
	 * But if the argument is unnamed, its value will get the index 0 instead.
	 */
	index: number
}

const defaultParentContext: Omit<ParentContextInfo, 'depth'> = {
	role:  RoleInParent.Root,
	index: 0
}

export interface ParentInformation extends ParentContextInfo {
	/** uniquely identifies an AST-Node */
	id:     NodeId
	/** Links to the parent node, using an id so that the AST stays serializable */
	parent: NodeId | undefined
}

export type RNodeWithParent<OtherInfo = NoInfo> = RNode<OtherInfo & ParentInformation>


export type AstIdMap<OtherInfo = NoInfo> = BiMap<NodeId, RNodeWithParent<OtherInfo>>
interface FoldInfo<OtherInfo> { idMap: AstIdMap<OtherInfo>, getId: IdGenerator<OtherInfo> }

/**
 * Contains the normalized AST as a doubly linked tree
 * and a map from ids to nodes so that parent links can be chased easily.
 */
export interface NormalizedAst<OtherInfo = ParentInformation, Node = RNode<OtherInfo & ParentInformation>> {
	/** Bidirectional mapping of ids to the corresponding nodes and the other way */
	idMap: AstIdMap<OtherInfo>
	/** The root of the AST with parent information */
	ast:   Node
}

/**
 * Covert the given AST into a doubly linked tree while assigning ids (so it stays serializable).
 *
 * @param ast   - The root of the AST to convert
 * @param getId - The id generator: must generate a unique id für each passed node
 *
 * @typeParam OtherInfo - The original decoration of the ast nodes (probably is nothing as the id decoration is most likely the first step to be performed after extraction)
 *
 * @returns A decorated AST based on the input and the id provider.
 */
export function decorateAst<OtherInfo = NoInfo>(ast: RNode<OtherInfo>, getId: IdGenerator<OtherInfo> = deterministicCountingIdGenerator(0)): NormalizedAst<OtherInfo & ParentInformation> {
	const idMap: AstIdMap<OtherInfo> = new BiMap<NodeId, RNodeWithParent<OtherInfo>>()
	const info: FoldInfo<OtherInfo> = { idMap, getId }

	/* Please note, that all fold processors do not re-create copies in higher-folding steps so that the idMap stays intact. */
	const foldLeaf = createFoldForLeaf(info)
	const foldBinaryOp = createFoldForBinaryOp(info)
	const unaryOp = createFoldForUnaryOp(info)

	/* we pass down the depth */
	const decoratedAst: RNodeWithParent<OtherInfo> = foldAstStateful(ast, -1,{
		down:         (_, down: number): number => down + 1,
		foldNumber:   foldLeaf,
		foldString:   foldLeaf,
		foldLogical:  foldLeaf,
		foldSymbol:   foldLeaf,
		foldAccess:   createFoldForAccess(info),
		foldBinaryOp: foldBinaryOp,
		foldPipe:     foldBinaryOp,
		foldUnaryOp:  unaryOp,
		other:        {
			foldComment:       foldLeaf,
			foldLineDirective: foldLeaf
		},
		loop: {
			foldFor:    createFoldForForLoop(info),
			foldRepeat: createFoldForRepeatLoop(info),
			foldWhile:  createFoldForWhileLoop(info),
			foldBreak:  foldLeaf,
			foldNext:   foldLeaf
		},
		foldIfThenElse: createFoldForIfThenElse(info),
		foldExprList:   createFoldForExprList(info),
		functions:      {
			foldFunctionDefinition: createFoldForFunctionDefinition(info),
			foldFunctionCall:       createFoldForFunctionCall(info),
			foldArgument:           createFoldForFunctionArgument(info),
			foldParameter:          createFoldForFunctionParameter(info)
		}
	})

	decoratedAst.info.role = RoleInParent.Root
	decoratedAst.info.index = 0

	return {
		ast: decoratedAst,
		idMap
	}
}

function createFoldForLeaf<OtherInfo>(info: FoldInfo<OtherInfo>) {
	return (data: RNode<OtherInfo>, depth: number): RNodeWithParent<OtherInfo> => {
		const id = info.getId(data)
		const decorated = {
			...data,
			info: {
				...data.info,
				id,
				parent: undefined,
				...defaultParentContext,
				depth
			}
		} as RNodeWithParent<OtherInfo>
		info.idMap.set(id, decorated)
		return decorated
	}
}

function createFoldForBinaryOp<OtherInfo>(info: FoldInfo<OtherInfo>) {
	return (data: RBinaryOp<OtherInfo> | RPipe<OtherInfo>, lhs: RNodeWithParent<OtherInfo>, rhs: RNodeWithParent<OtherInfo>, depth: number): RNodeWithParent<OtherInfo> => {
		const id = info.getId(data)
		const decorated = { ...data, info: { ...data.info, id, parent: undefined, depth }, lhs, rhs } as RNodeWithParent<OtherInfo>
		info.idMap.set(id, decorated)
		const lhsInfo = lhs.info
		lhsInfo.parent = id
		const rhsInfo = rhs.info
		rhsInfo.parent = id
		rhsInfo.index = 1
		if(data.type === RType.Pipe) {
			lhsInfo.role = RoleInParent.PipeLhs
			rhsInfo.role = RoleInParent.PipeRhs
		} else {
			lhsInfo.role = RoleInParent.BinaryOperationLhs
			rhsInfo.role = RoleInParent.BinaryOperationRhs
		}
		return decorated
	}
}

function createFoldForUnaryOp<OtherInfo>(info: FoldInfo<OtherInfo>) {
	return (data: RNode<OtherInfo>, operand: RNodeWithParent<OtherInfo>, depth: number): RNodeWithParent<OtherInfo> => {
		const id = info.getId(data)
		const decorated = { ...data, info: { ...data.info, id, parent: undefined, depth }, operand } as RNodeWithParent<OtherInfo>
		info.idMap.set(id, decorated)
		const opInfo = operand.info
		opInfo.parent = id
		opInfo.role = RoleInParent.UnaryOperand
		return decorated
	}
}

function createFoldForAccess<OtherInfo>(info: FoldInfo<OtherInfo>) {
	return (data: RNode<OtherInfo>, accessed: RNodeWithParent<OtherInfo>, access: readonly (RNodeWithParent<OtherInfo> | typeof EmptyArgument)[], depth: number): RNodeWithParent<OtherInfo> => {
		const id = info.getId(data)
		const decorated = { ...data, info: { ...data.info, id, parent: undefined, depth }, accessed, access } as RNodeWithParent<OtherInfo>
		info.idMap.set(id, decorated)
		const accessedInfo = accessed.info
		accessedInfo.parent = id
		accessedInfo.role = RoleInParent.Accessed
		if(typeof access !== 'string') {
			let idx = 0 // the first oe will be skipped in the first iter
			for(const acc of access) {
				idx++
				if(acc !== EmptyArgument) {
					const curInfo = acc.info
					curInfo.parent = id
					curInfo.index = idx
					curInfo.role = RoleInParent.IndexAccess
				}
			}
		}
		return decorated
	}
}

function createFoldForForLoop<OtherInfo>(info: FoldInfo<OtherInfo>) {
	return (data: RNode<OtherInfo>, variable: RNodeWithParent<OtherInfo>, vector: RNodeWithParent<OtherInfo>, body: RNodeWithParent<OtherInfo>, depth: number): RNodeWithParent<OtherInfo> => {
		const id = info.getId(data)
		const decorated = { ...data, info: { ...data.info, id, parent: undefined, depth }, variable, vector, body } as RNodeWithParent<OtherInfo>
		info.idMap.set(id, decorated)
		const varInfo = variable.info
		varInfo.parent = id
		varInfo.role = RoleInParent.ForVariable
		const vecInfo = vector.info
		vecInfo.parent = id
		vecInfo.index = 1
		vecInfo.role = RoleInParent.ForVector
		const bodyInfo = body.info
		bodyInfo.parent = id
		bodyInfo.index = 2
		bodyInfo.role = RoleInParent.ForBody
		return decorated
	}
}

function createFoldForRepeatLoop<OtherInfo>(info: FoldInfo<OtherInfo>) {
	return (data: RNode<OtherInfo>, body: RNodeWithParent<OtherInfo>, depth: number): RNodeWithParent<OtherInfo> => {
		const id = info.getId(data)
		const decorated = { ...data, info: { ...data.info, id, parent: undefined, depth },  body } as RNodeWithParent<OtherInfo>
		info.idMap.set(id, decorated)
		const bodyInfo = body.info
		bodyInfo.parent = id
		bodyInfo.role = RoleInParent.RepeatBody
		return decorated
	}
}

function createFoldForWhileLoop<OtherInfo>(info: FoldInfo<OtherInfo>) {
	return (data: RNode<OtherInfo>, condition: RNodeWithParent<OtherInfo>, body: RNodeWithParent<OtherInfo>, depth: number): RNodeWithParent<OtherInfo> => {
		const id = info.getId(data)
		const decorated = { ...data, info: { ...data.info, id, parent: undefined, depth },  condition, body } as RNodeWithParent<OtherInfo>
		info.idMap.set(id, decorated)
		const condInfo = condition.info
		condInfo.parent = id
		condInfo.role = RoleInParent.WhileCondition
		const bodyInfo = body.info
		bodyInfo.parent = id
		bodyInfo.index = 1
		bodyInfo.role = RoleInParent.WhileBody
		return decorated
	}
}

function createFoldForIfThenElse<OtherInfo>(info: FoldInfo<OtherInfo>) {
	return (data: RNode<OtherInfo>, condition: RNodeWithParent<OtherInfo>, then: RNodeWithParent<OtherInfo>, otherwise: RNodeWithParent<OtherInfo> | undefined, depth: number): RNodeWithParent<OtherInfo> => {
		const id = info.getId(data)
		const decorated = { ...data, info: { ...data.info, id, parent: undefined, depth }, condition, then, otherwise } as RNodeWithParent<OtherInfo>
		info.idMap.set(id, decorated)
		const condInfo = condition.info
		condInfo.parent = id
		condInfo.role = RoleInParent.IfCondition
		const thenInfo = then.info
		thenInfo.parent = id
		thenInfo.index = 1
		thenInfo.role = RoleInParent.IfThen
		if(otherwise) {
			const otherwiseInfo = otherwise.info
			otherwiseInfo.parent = id
			otherwiseInfo.index = 2
			otherwiseInfo.role = RoleInParent.IfOtherwise
		}
		return decorated
	}
}

function createFoldForExprList<OtherInfo>(info: FoldInfo<OtherInfo>) {
	return (data: RExpressionList<OtherInfo>, grouping: [RNodeWithParent<OtherInfo>, RNodeWithParent<OtherInfo>] | undefined, children: readonly RNodeWithParent<OtherInfo>[], depth: number): RNodeWithParent<OtherInfo> => {
		const id = info.getId(data)
		const decorated = { ...data, info: { ...data.info, id, parent: undefined, depth }, grouping, children } as RNodeWithParent<OtherInfo>
		info.idMap.set(id, decorated)
		let i = 0
		for(const child of children) {
			const childInfo = child.info
			childInfo.parent = id
			childInfo.index = i++
			childInfo.role = RoleInParent.ExpressionListChild
		}
		return decorated
	}
}

function createFoldForFunctionCall<OtherInfo>(info: FoldInfo<OtherInfo>) {
	return (data: RFunctionCall<OtherInfo>, functionName: RNodeWithParent<OtherInfo>, args: readonly (RNodeWithParent<OtherInfo> | typeof EmptyArgument)[], depth: number): RNodeWithParent<OtherInfo> => {
		const id = info.getId(data)
		let decorated: RFunctionCall<OtherInfo & ParentInformation>
		if(data.named) {
			decorated = { ...data, info: { ...data.info, id, parent: undefined, depth }, functionName, arguments: args } as RNamedFunctionCall<OtherInfo & ParentInformation>
		} else {
			decorated = { ...data, info: { ...data.info, id, parent: undefined, depth }, calledFunction: functionName, arguments: args } as RUnnamedFunctionCall<OtherInfo & ParentInformation>
		}
		info.idMap.set(id, decorated)
		const funcInfo = functionName.info
		funcInfo.parent = id
		funcInfo.role = RoleInParent.FunctionCallName
		let idx = 0
		for(const arg of args) {
			idx++
			if(arg !== EmptyArgument) {
				const argInfo = arg.info
				argInfo.parent = id
				argInfo.index = idx
				argInfo.role = RoleInParent.FunctionCallArgument
			}
		}
		return decorated
	}
}

function createFoldForFunctionDefinition<OtherInfo>(info: FoldInfo<OtherInfo>) {
	return (data: RNode<OtherInfo>, params: RNodeWithParent<OtherInfo>[], body: RNodeWithParent<OtherInfo>, depth: number): RNodeWithParent<OtherInfo> => {
		const id = info.getId(data)
		const decorated = { ...data, info: { ...data.info, id, parent: undefined, depth }, parameters: params, body } as RNodeWithParent<OtherInfo>
		info.idMap.set(id, decorated)
		let idx = 0
		for(const param of params) {
			const paramInfo = param.info
			paramInfo.parent = id
			paramInfo.index = idx++
			paramInfo.role = RoleInParent.FunctionDefinitionParameter
		}
		const bodyInfo = body.info
		bodyInfo.parent = id
		bodyInfo.index = idx
		bodyInfo.role = RoleInParent.FunctionDefinitionBody
		return decorated
	}
}

function createFoldForFunctionParameter<OtherInfo>(info: FoldInfo<OtherInfo>) {
	return (data: RParameter<OtherInfo>, name: RNodeWithParent<OtherInfo>, defaultValue: RNodeWithParent<OtherInfo> | undefined, depth: number): RNodeWithParent<OtherInfo> => {
		const id = info.getId(data)
		const decorated = { ...data, info: { ...data.info, id, parent: undefined, depth }, name, defaultValue } as RParameter<OtherInfo & ParentInformation>
		info.idMap.set(id, decorated)
		const nameInfo = name.info
		nameInfo.parent = id
		nameInfo.role = RoleInParent.ParameterName
		if(defaultValue) {
			const defaultInfo = defaultValue.info
			defaultInfo.parent = id
			defaultInfo.index = 1
			defaultInfo.role = RoleInParent.ParameterDefaultValue
		}
		return decorated
	}
}

function createFoldForFunctionArgument<OtherInfo>(info: FoldInfo<OtherInfo>) {
	return (data: RArgument<OtherInfo>, name: RNodeWithParent<OtherInfo> | undefined, value: RNodeWithParent<OtherInfo> | undefined, depth: number): RNodeWithParent<OtherInfo> => {
		const id = info.getId(data)
		const decorated = { ...data, info: { ...data.info, id, parent: undefined, depth }, name, value } as RNodeWithParent<OtherInfo>
		info.idMap.set(id, decorated)
		let idx = 0
		if(name) {
			const nameInfo = name.info
			nameInfo.parent = id
			nameInfo.role = RoleInParent.ArgumentName
			idx++ // adaptive, 0 for the value if there is no name!
		}
		if(value) {
			const valueInfo = value.info
			valueInfo.parent = id
			valueInfo.index = idx
			valueInfo.role = RoleInParent.ArgumentValue
		}
		return decorated
	}
}
