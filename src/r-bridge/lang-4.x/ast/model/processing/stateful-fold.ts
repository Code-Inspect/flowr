import { assertUnreachable } from '../../../../../util/assert'
import type { DeepReadonly } from 'ts-essentials'
import { RType } from '../type'
import type {
	RExpressionList,
	RNumber,
	RSymbol,
	RLogical,
	RString,
	RBinaryOp,
	RUnaryOp,
	RIfThenElse,
	RForLoop,
	RRepeatLoop,
	RWhileLoop,
	RFunctionCall,
	RComment,
	RNext,
	RBreak,
	RParameter,
	RArgument,
	RFunctionDefinition,
	RAccess,
	RLineDirective, RPipe
} from '../nodes'
import { EmptyArgument
} from '../nodes'
import type { RNode } from '../model'


/**
 * Called during the down-pass, will pe propagated to children and used in the up-pass (see {@link StatefulFoldFunctions}).
 * <p>
 * Exists for leafs as well for consistency reasons.
 */
export type DownFold<Info, Down> = (node: RNode<Info>, down: Down) => Down

/**
 * All fold functions besides `down` are called after the down-pass in conventional fold-fashion.
 * The `down` argument holds information obtained during the down-pass, issued by the `down` function.
 */
export interface StatefulFoldFunctions<Info, Down, Up> {
	down:         DownFold<Info, Down>
	foldNumber:   (num: RNumber<Info>, down: Down) => Up;
	foldString:   (str: RString<Info>, down: Down) => Up;
	foldLogical:  (logical: RLogical<Info>, down: Down) => Up;
	foldSymbol:   (symbol: RSymbol<Info>, down: Down) => Up;
	foldAccess:   (node: RAccess<Info>, name: Up, access: readonly (typeof EmptyArgument | Up)[], down: Down) => Up;
	foldBinaryOp: (op: RBinaryOp<Info>, lhs: Up, rhs: Up, down: Down) => Up;
	foldPipe:     (op: RPipe<Info>, lhs: Up, rhs: Up, down: Down) => Up;
	foldUnaryOp:  (op: RUnaryOp<Info>, operand: Up, down: Down) => Up;
	loop: {
		foldFor:    (loop: RForLoop<Info>, variable: Up, vector: Up, body: Up, down: Down) => Up;
		foldWhile:  (loop: RWhileLoop<Info>, condition: Up, body: Up, down: Down) => Up;
		foldRepeat: (loop: RRepeatLoop<Info>, body: Up, down: Down) => Up;
		foldNext:   (next: RNext<Info>, down: Down) => Up;
		foldBreak:  (next: RBreak<Info>, down: Down) => Up;
	};
	other: {
		foldComment:       (comment: RComment<Info>, down: Down) => Up;
		foldLineDirective: (comment: RLineDirective<Info>, down: Down) => Up;
	};
	/** The `otherwise` argument is `undefined` if the `else` branch is missing */
	foldIfThenElse: (ifThenExpr: RIfThenElse<Info>, cond: Up, then: Up, otherwise: Up | undefined, down: Down ) => Up;
	foldExprList:   (exprList: RExpressionList<Info>, grouping: [start: Up, end: Up] | undefined, expressions: Up[], down: Down) => Up;
	functions: {
		foldFunctionDefinition: (definition: RFunctionDefinition<Info>, params: Up[], body: Up, down: Down) => Up;
		/** folds named and unnamed function calls */
		foldFunctionCall:       (call: RFunctionCall<Info>, functionNameOrExpression: Up, args: (Up | typeof EmptyArgument)[], down: Down) => Up;
		/** The `name` is `undefined` if the argument is unnamed, the value, if we have something like `x=,...` */
		foldArgument:           (argument: RArgument<Info>, name: Up | undefined, value: Up | undefined, down: Down) => Up;
		/** The `defaultValue` is `undefined` if the argument was not initialized with a default value */
		foldParameter:          (parameter: RParameter<Info>, name: Up, defaultValue: Up | undefined, down: Down) => Up;
	}
}


/**
 * Folds in old functional-fashion over the AST structure but allowing for a down function which can pass context to child nodes.
 */
export function foldAstStateful<Info, Down, Up>(ast: RNode<Info>, down: Down, folds: DeepReadonly<StatefulFoldFunctions<Info, Down, Up>>): Up {
	const type = ast.type
	down = folds.down(ast, down)
	switch(type) {
		case RType.Number:
			return folds.foldNumber(ast, down)
		case RType.String:
			return folds.foldString(ast, down)
		case RType.Logical:
			return folds.foldLogical(ast, down)
		case RType.Symbol:
			return folds.foldSymbol(ast, down)
		case RType.Comment:
			return folds.other.foldComment(ast, down)
		case RType.LineDirective:
			return folds.other.foldLineDirective(ast, down)
		case RType.Pipe:
			return folds.foldPipe(ast, foldAstStateful(ast.lhs, down, folds), foldAstStateful(ast.rhs, down, folds), down)
		case RType.BinaryOp:
			return folds.foldBinaryOp(ast, foldAstStateful(ast.lhs, down, folds), foldAstStateful(ast.rhs, down, folds), down)
		case RType.UnaryOp:
			return folds.foldUnaryOp(ast, foldAstStateful(ast.operand, down, folds), down)
		case RType.Access:
			return folds.foldAccess(ast, foldAstStateful(ast.accessed, down, folds), ast.access.map(access => access === EmptyArgument ? EmptyArgument : foldAstStateful(access, down, folds)), down)
		case RType.ForLoop:
			return folds.loop.foldFor(ast, foldAstStateful(ast.variable, down, folds), foldAstStateful(ast.vector, down, folds), foldAstStateful(ast.body, down, folds), down)
		case RType.WhileLoop:
			return folds.loop.foldWhile(ast, foldAstStateful(ast.condition, down, folds), foldAstStateful(ast.body, down, folds), down)
		case RType.RepeatLoop:
			return folds.loop.foldRepeat(ast, foldAstStateful(ast.body, down, folds), down)
		case RType.FunctionCall:
			return folds.functions.foldFunctionCall(ast, foldAstStateful(ast.flavor === 'named' ? ast.functionName : ast.calledFunction, down, folds), ast.arguments.map(param => param === EmptyArgument ? param : foldAstStateful(param, down, folds)), down)
		case RType.FunctionDefinition:
			return folds.functions.foldFunctionDefinition(ast, ast.parameters.map(param => foldAstStateful(param, down, folds)), foldAstStateful(ast.body, down, folds), down)
		case RType.Parameter:
			return folds.functions.foldParameter(ast, foldAstStateful(ast.name, down, folds), ast.defaultValue ? foldAstStateful(ast.defaultValue, down, folds) : undefined, down)
		case RType.Argument:
			return folds.functions.foldArgument(ast, ast.name ? foldAstStateful(ast.name, down, folds) : undefined, ast.value ? foldAstStateful(ast.value, down, folds) : undefined, down)
		case RType.Next:
			return folds.loop.foldNext(ast, down)
		case RType.Break:
			return folds.loop.foldBreak(ast, down)
		case RType.IfThenElse:
			return folds.foldIfThenElse(ast, foldAstStateful(ast.condition, down, folds), foldAstStateful(ast.then, down, folds), ast.otherwise === undefined ? undefined : foldAstStateful(ast.otherwise, down, folds), down)
		case RType.ExpressionList:
			return folds.foldExprList(ast, ast.grouping ? [foldAstStateful(ast.grouping[0], down, folds), foldAstStateful(ast.grouping[1], down, folds)] : undefined ,  ast.children.map(expr => foldAstStateful(expr, down, folds)), down)
		default:
			assertUnreachable(type)
	}
}

