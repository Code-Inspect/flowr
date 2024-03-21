import type { Base, Location, NoInfo, RNode } from '../model'
import type { RType } from '../type'
import type { UnaryOperatorFlavor } from '../operators'

export interface RUnaryOp<Info = NoInfo> extends Base<Info>, Location {
	readonly type:   RType.UnaryOp;
	readonly flavor: UnaryOperatorFlavor;
	operator:        string;
	operand:         RNode<Info>;
}

export interface RLogicalUnaryOp<Info = NoInfo> extends RUnaryOp<Info> {
	flavor: 'logical'
}

export interface RArithmeticUnaryOp<Info = NoInfo> extends RUnaryOp<Info> {
	flavor: 'arithmetic'
}

export interface RModelFormulaUnaryOp<Info = NoInfo> extends RUnaryOp<Info> {
	flavor: 'model formula'
}

