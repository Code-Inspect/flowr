import type {
	NodeId,
	ParentInformation,
	RExpressionList,
	RIfThenElse, RLoopConstructs,
	RNode } from '../../../../r-bridge'
import {
	RType
} from '../../../../r-bridge'
import { assertUnreachable } from '../../../../util/assert'

interface ExitPointsInformation {
	/** For those it is known that they exit the current scope, (e.g. return statements) */
	knownIds:     NodeId[]
	/** Those _can_ exit the current scope (e.g. an implicit return) */
	potentialIds: NodeId[]
}

// TODO: wir wollen exit points für alle expression lists nicht nur für function definitions -> wir schlagen alle mit einer klappe :3
export function retrieveExitPointsOfFunctionDefinition<OtherInfo>(body: RNode<OtherInfo & ParentInformation>): NodeId[] {
	const exitPoints = visitExitPoints(body)
	return exitPoints.knownIds.concat(exitPoints.potentialIds)
}

// TODO: fold
function visitExitPoints<OtherInfo>(node: RNode<OtherInfo & ParentInformation>): ExitPointsInformation {
	const type = node.type
	switch(type) {
		case RType.ExpressionList:
			return visitExpressionList(node)
		case RType.FunctionCall:
			// TODO: what if return is overwritten
			if(node.flavor === 'named' && node.functionName.content === 'return') {
				return {
					knownIds:     [ node.info.id ],
					potentialIds: []
				}
			}
			break
		case RType.FunctionDefinition:
			// do not further investigate
			break
		case RType.ForLoop:
		case RType.WhileLoop:
		case RType.RepeatLoop:
			// loops return invisible null, as we do not trace values, but they may contain return statements
			return visitLoops(node)
		case RType.IfThenElse:
			return visitIf(node)
		case RType.Pipe:
		case RType.BinaryOp:
			// assignments return invisible rhs
			return knownIdsOfChildren(node.info.id, node.lhs, node.rhs)
		case RType.UnaryOp:
			return knownIdsOfChildren(node.info.id, node.operand)
		case RType.Parameter:
			return node.defaultValue ? knownIdsOfChildren(node.info.id, node.defaultValue) : { knownIds: [], potentialIds: [] }
		case RType.Argument:
			return node.value ? knownIdsOfChildren(node.info.id, node.value) : { knownIds: [], potentialIds: [] }
		case RType.Symbol:
		case RType.Logical:
		case RType.Number:
		case RType.String:
		case RType.Access:
			// just use this node
			break
			// contain noting to return/return `invisible(null)`
		case RType.Comment:
		case RType.LineDirective:
		case RType.Break:
		case RType.Next:
			// TODO: wrong for loops
			return { knownIds: [], potentialIds: [] }
		default:
			assertUnreachable(type)
	}

	return {
		knownIds:     [],
		potentialIds: [ node.info.id ]
	}
}


// we use keepSelfAsPotential in order to track nodes like 2 + 3, which keep themselves as potential exit points if there are no knownIds
function knownIdsOfChildren<OtherInfo>(keepSelfAsPotential: NodeId, ...children: RNode<OtherInfo & ParentInformation>[]): ExitPointsInformation {
	const knownIds = children.flatMap(child => visitExitPoints(child).knownIds)
	return {
		knownIds,
		potentialIds: knownIds.length === 0 ? [ keepSelfAsPotential ] : []
	}
}
function visitLoops<OtherInfo>(loop: RLoopConstructs<OtherInfo & ParentInformation>): ExitPointsInformation {
	const result = visitExitPoints(loop.body)
	// conditions may contain return statements which we have to keep
	let otherKnownIds: NodeId[] = []
	if(loop.type === RType.ForLoop) {
		otherKnownIds = visitExitPoints(loop.variable).knownIds
		otherKnownIds.push(...visitExitPoints(loop.vector).knownIds)
	} else if(loop.type === RType.WhileLoop) {
		otherKnownIds = visitExitPoints(loop.condition).knownIds
	}
	return {
		knownIds:     [...result.knownIds, ...otherKnownIds],
		potentialIds: []
	}
}

function visitExpressionList<OtherInfo>(node: RExpressionList<OtherInfo & ParentInformation>): ExitPointsInformation {
	const known: NodeId[] = []
	let lastPotentialIds: NodeId[] = []

	// we only keep the potential ids of the last expression, which is no comment
	for(const child of node.children) {
		const { knownIds, potentialIds } = visitExitPoints(child)
		known.push(...knownIds)
		if(child.type !== RType.Comment) {
			lastPotentialIds = potentialIds
		}
	}

	return {
		knownIds:     known,
		potentialIds: lastPotentialIds
	}
}

function visitIf<OtherInfo>(node: RIfThenElse<OtherInfo & ParentInformation>): ExitPointsInformation {
	// conditions can contain return statements
	const known: NodeId[] = visitExitPoints(node.condition).knownIds
	const potential: NodeId[] = []

	const thenCase = visitExitPoints(node.then)
	known.push(...thenCase.knownIds)
	potential.push(...thenCase.potentialIds)

	if(node.otherwise !== undefined) {
		const otherwiseCase = visitExitPoints(node.otherwise)
		known.push(...otherwiseCase.knownIds)
		potential.push(...otherwiseCase.potentialIds)
	}

	return {
		knownIds:     known,
		potentialIds: potential
	}
}
