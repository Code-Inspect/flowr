import { assertUnreachable } from '../../../../../util/assert'
import type { DeepReadonly } from 'ts-essentials'
import { RType } from '../type'
import type {
	RExpressionList,
	RNumber,
	RSymbol,
	RLogical,
	RString,
	RArithmeticBinaryOp,
	RAssignmentOp,
	RBinaryOp,
	RComparisonBinaryOp,
	RLogicalBinaryOp,
	RArithmeticUnaryOp,
	RLogicalUnaryOp,
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
	RModelFormulaBinaryOp,
	RModelFormulaUnaryOp,
	RLineDirective,
	RPipe
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
	down:        DownFold<Info, Down>
	foldNumber:  (num: RNumber<Info>, down: Down) => Up;
	foldString:  (str: RString<Info>, down: Down) => Up;
	foldLogical: (logical: RLogical<Info>, down: Down) => Up;
	foldSymbol:  (symbol: RSymbol<Info>, down: Down) => Up;
	foldAccess:  (node: RAccess<Info>, name: Up, access: string | (null | Up)[], down: Down) => Up;
	binaryOp: {
		foldLogicalOp:    (op: RLogicalBinaryOp<Info>, lhs: Up, rhs: Up, down: Down) => Up;
		foldArithmeticOp: (op: RArithmeticBinaryOp<Info>, lhs: Up, rhs: Up, down: Down) => Up;
		foldComparisonOp: (op: RComparisonBinaryOp<Info>, lhs: Up, rhs: Up, down: Down) => Up;
		foldAssignment:   (op: RAssignmentOp<Info>, lhs: Up, rhs: Up, down: Down) => Up;
		foldPipe:         (op: RPipe<Info>, lhs: Up, rhs: Up, down: Down) => Up;
		foldModelFormula: (op: RModelFormulaBinaryOp<Info>, lhs: Up, rhs: Up, down: Down) => Up;
	};
	unaryOp: {
		foldLogicalOp:    (op: RLogicalUnaryOp<Info>, operand: Up, down: Down) => Up;
		foldArithmeticOp: (op: RArithmeticUnaryOp<Info>, operand: Up, down: Down) => Up;
		foldModelFormula: (op: RModelFormulaUnaryOp<Info>, operand: Up, down: Down) => Up;
	};
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
	foldExprList:   (exprList: RExpressionList<Info>, expressions: Up[], down: Down) => Up;
	functions: {
		foldFunctionDefinition: (definition: RFunctionDefinition<Info>, params: Up[], body: Up, down: Down) => Up;
		/** folds named and unnamed function calls */
		foldFunctionCall:       (call: RFunctionCall<Info>, functionNameOrExpression: Up, args: (Up | undefined)[], down: Down) => Up;
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
			return folds.binaryOp.foldPipe(ast, foldAstStateful(ast.lhs, down, folds), foldAstStateful(ast.rhs, down, folds), down)
		case RType.BinaryOp:
			return foldBinaryOp(ast, down, folds)
		case RType.UnaryOp:
			return foldUnaryOp(ast, down, folds)
		case RType.Access:
			return folds.foldAccess(ast, foldAstStateful(ast.accessed, down, folds), ast.operator === '[' || ast.operator === '[[' ? ast.access.map(access => access === null ? null : foldAstStateful(access, down, folds)) : ast.access as string, down)
		case RType.ForLoop:
			return folds.loop.foldFor(ast, foldAstStateful(ast.variable, down, folds), foldAstStateful(ast.vector, down, folds), foldAstStateful(ast.body, down, folds), down)
		case RType.WhileLoop:
			return folds.loop.foldWhile(ast, foldAstStateful(ast.condition, down, folds), foldAstStateful(ast.body, down, folds), down)
		case RType.RepeatLoop:
			return folds.loop.foldRepeat(ast, foldAstStateful(ast.body, down, folds), down)
		case RType.FunctionCall:
			return folds.functions.foldFunctionCall(ast, foldAstStateful(ast.flavor === 'named' ? ast.functionName : ast.calledFunction, down, folds), ast.arguments.map(param => param === undefined ? param : foldAstStateful(param, down, folds)), down)
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
			return folds.foldExprList(ast, ast.children.map(expr => foldAstStateful(expr, down, folds)), down)
		default:
			assertUnreachable(type)
	}
}

function foldBinaryOp<Info, Down, Up>(ast: RBinaryOp<Info>, down: Down, folds: StatefulFoldFunctions<Info, Down, Up>): Up {
	switch(ast.flavor) {
		case 'logical':
			return folds.binaryOp.foldLogicalOp(ast as RLogicalBinaryOp<Info>, foldAstStateful(ast.lhs, down, folds), foldAstStateful(ast.rhs, down, folds), down)
		case 'arithmetic':
			return folds.binaryOp.foldArithmeticOp(ast as RArithmeticBinaryOp<Info>, foldAstStateful(ast.lhs, down, folds), foldAstStateful(ast.rhs, down, folds), down)
		case 'comparison':
			return folds.binaryOp.foldComparisonOp(ast as RComparisonBinaryOp<Info>, foldAstStateful(ast.lhs, down, folds), foldAstStateful(ast.rhs, down, folds), down)
		case 'assignment':
			return folds.binaryOp.foldAssignment(ast as RAssignmentOp<Info>, foldAstStateful(ast.lhs, down, folds), foldAstStateful(ast.rhs, down, folds), down)
		case 'model formula':
			return folds.binaryOp.foldModelFormula(ast as RModelFormulaBinaryOp<Info>, foldAstStateful(ast.lhs, down, folds), foldAstStateful(ast.rhs, down, folds), down)
		default:
			assertUnreachable(ast.flavor)
	}
}


function foldUnaryOp<Info, Down, Up>(ast: RUnaryOp<Info>, down: Down, folds: StatefulFoldFunctions<Info, Down, Up>): Up {
	switch(ast.flavor) {
		case 'logical':
			return folds.unaryOp.foldLogicalOp(ast as RLogicalUnaryOp<Info>, foldAstStateful(ast.operand, down, folds), down)
		case 'arithmetic':
			return folds.unaryOp.foldArithmeticOp(ast as RArithmeticUnaryOp<Info>, foldAstStateful(ast.operand, down, folds), down)
		case 'model formula':
			return folds.unaryOp.foldModelFormula(ast as RModelFormulaUnaryOp<Info>, foldAstStateful(ast.operand, down, folds), down)
		default:
			assertUnreachable(ast.flavor)
	}
}
