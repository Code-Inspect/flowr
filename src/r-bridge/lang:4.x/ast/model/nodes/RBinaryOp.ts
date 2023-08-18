// TODO: others?
import { Base, Location, NoInfo, RNode } from "../model"
import { Type } from "../type"
import { BinaryOperatorFlavor } from "../operators"

export interface RBinaryOp<Info = NoInfo> extends Base<Info>, Location {
	readonly type:   Type.BinaryOp;
	readonly flavor: BinaryOperatorFlavor;
	operator:        string;
	lhs:             RNode<Info>;
	rhs:             RNode<Info>;
}

export interface RLogicalBinaryOp<Info = NoInfo> extends RBinaryOp<Info> {
	flavor: 'logical'
}

export interface RArithmeticBinaryOp<Info = NoInfo> extends RBinaryOp<Info> {
	flavor: 'arithmetic'
}

export interface RComparisonBinaryOp<Info = NoInfo> extends RBinaryOp<Info> {
	flavor: 'comparison'
}

export interface RAssignmentOp<Info = NoInfo> extends RBinaryOp<Info> {
	flavor: 'assignment'
}

export interface RModelFormulaBinaryOp<Info = NoInfo> extends RBinaryOp<Info> {
	flavor: 'model formula'
}
