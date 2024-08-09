import type { Base, Location, NoInfo, RNode } from '../model'
import type { RType } from '../type'
import type { RParameter } from './r-parameter'

export interface RFunctionDefinition<Info = NoInfo> extends Base<Info>, Location {
	readonly type: RType.FunctionDefinition;
	/** the R formals, to our knowledge they must be unique */
	parameters:    RParameter<Info>[];
	body:          RNode<Info>;
}
