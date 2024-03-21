import type { Base, Location, NoInfo } from '../model'
import type { RType } from '../type'
import type { RParameter } from './r-parameter'
import type { RExpressionList } from './r-expression-list'

export interface RFunctionDefinition<Info = NoInfo> extends Base<Info>, Location {
	readonly type: RType.FunctionDefinition;
	/** the R formals, to our knowledge they must be unique */
	parameters:    RParameter<Info>[];
	body:          RExpressionList<Info>;
}
