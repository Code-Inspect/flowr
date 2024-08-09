import type { SlicingCriteriaFilter } from '../collect-all'
import { isNotNull } from '../../../util/assert'
import type { NodeId } from '../../../r-bridge/lang-4.x/ast/model/processing/node-id'
import type { FoldFunctions } from '../../../r-bridge/lang-4.x/ast/model/processing/fold'
import { foldAst } from '../../../r-bridge/lang-4.x/ast/model/processing/fold'
import type { ParentInformation, RNodeWithParent } from '../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RSymbol } from '../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import { isSpecialSymbol } from '../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import type { RFunctionCall } from '../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import { EmptyArgument } from '../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'

export const DefaultAllVariablesFilter: SlicingCriteriaFilter = {
	minimumSize: 1,
	maximumSize: 1,
	collectAll:  defaultAllVariablesCollector
}

const onLeaf = () => []
const onBinary = (_: unknown, lhs: NodeId[], rhs: NodeId[]) => [...lhs, ...rhs]
const defaultAllVariablesCollectorFolds: FoldFunctions<ParentInformation, NodeId[]> = {
	foldNumber:   onLeaf,
	foldString:   onLeaf,
	foldLogical:  onLeaf,
	foldSymbol:   (symbol: RSymbol<ParentInformation>) => isSpecialSymbol(symbol) ? [] : [symbol.info.id],
	foldAccess:   (_: unknown, name: NodeId[], access: readonly (typeof EmptyArgument | NodeId[])[]) => [...name, ...access.filter(isNotNull).flat()],
	foldBinaryOp: onBinary,
	foldPipe:     onBinary,
	foldUnaryOp:  (_: unknown, operator: NodeId[]) => operator,
	loop:         {
		foldFor:    (_: unknown, a: NodeId[], b: NodeId[], c: NodeId[]) => [...a,...b,...c],
		foldWhile:  (_: unknown, a: NodeId[], b: NodeId[]) => [...a,...b],
		foldRepeat: (_: unknown, a: NodeId[]) => a,
		foldNext:   onLeaf,
		foldBreak:  onLeaf
	},
	other: {
		foldComment:       onLeaf,
		foldLineDirective: onLeaf
	},
	foldIfThenElse: (_: unknown, a: NodeId[], b: NodeId[], c: NodeId[] | undefined) => [...a,...b,...(c??[])],
	foldExprList:   (_: unknown, _grouping: unknown, a: NodeId[][]) => a.flat(),
	functions:      {
		foldFunctionDefinition: (_: unknown, a: NodeId[][], b: NodeId[]) => [...a.flat(),...b],
		foldFunctionCall:       (c: RFunctionCall, a: NodeId[], b: (NodeId[] | typeof EmptyArgument)[]) => {
			const args = b.flatMap(b => b !== EmptyArgument ? b.flat() : [])
			if(c.named) {
				return c.functionName.content === 'library' ? args.slice(1) : args
			} else {
				return [...a.filter(x => x !== EmptyArgument), ...args]
			}
		},
		foldArgument:  (_: unknown, _a: unknown, b: NodeId[] | undefined) => b ?? [],
		foldParameter: (_: unknown, _a: unknown, b: NodeId[] | undefined) => b ?? []
	}
}

function defaultAllVariablesCollector(ast: RNodeWithParent): NodeId[] {
	return foldAst(ast, defaultAllVariablesCollectorFolds)
}
