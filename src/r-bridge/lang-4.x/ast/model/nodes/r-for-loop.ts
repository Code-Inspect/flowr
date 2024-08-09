import type { Base, Location, NoInfo, RNode } from '../model'
import type { RType } from '../type'
import type { RSymbol } from './r-symbol'
import type { RExpressionList } from './r-expression-list'

/**
 * ```ts
 * for(<variable> in <vector>) <body>
 * ```
 */
export interface RForLoop<Info = NoInfo> extends Base<Info>, Location {
	readonly type: RType.ForLoop
	/** variable used in for-loop: <p> `for(<variable> in ...) ...`*/
	variable:      RSymbol<Info>
	/** vector used in for-loop: <p> `for(... in <vector>) ...`*/
	vector:        RNode<Info>
	/** body used in for-loop: <p> `for(... in ...) <body>`*/
	body:          RExpressionList<Info>
}
