import type { DataflowInformation } from './info'
import type { DataflowProcessors } from './processor'
import { processDataflowFor } from './processor'
import { processUninterestingLeaf } from './internal/process/process-uninteresting-leaf'
import { processSymbol } from './internal/process/process-symbol'
import { processFunctionCall } from './internal/process/functions/call/default-call-handling'
import { processFunctionParameter } from './internal/process/functions/process-parameter'
import { processFunctionArgument } from './internal/process/functions/process-argument'
import { processAsNamedCall } from './internal/process/process-named-call'
import { processValue } from './internal/process/process-value'
import { processNamedCall } from './internal/process/functions/call/named-call-handling'
import { wrapArgumentsUnnamed } from './internal/process/functions/call/argument/make-argument'
import { rangeFrom } from '../util/range'
import type { NormalizedAst, ParentInformation } from '../r-bridge/lang-4.x/ast/model/processing/decorate'
import { RType } from '../r-bridge/lang-4.x/ast/model/type'
import type { RParseRequest } from '../r-bridge/retriever'
import { requestFingerprint } from '../r-bridge/retriever'
import { initializeCleanEnvironments } from './environments/environment'

export const processors: DataflowProcessors<ParentInformation> = {
	[RType.Number]:             processValue,
	[RType.String]:             processValue,
	[RType.Logical]:            processValue,
	[RType.Comment]:            processUninterestingLeaf,
	[RType.LineDirective]:      processUninterestingLeaf,
	[RType.Symbol]:             processSymbol,
	[RType.Access]:             (n, d) => processAsNamedCall(n, d, n.operator, [n.accessed, ...n.access]),
	[RType.BinaryOp]:           (n, d) => processAsNamedCall(n, d, n.operator, [n.lhs, n.rhs]),
	[RType.Pipe]:               (n, d) => processAsNamedCall(n, d, n.lexeme, [n.lhs, n.rhs]),
	[RType.UnaryOp]:            (n, d) => processAsNamedCall(n, d, n.operator, [n.operand]),
	[RType.ForLoop]:            (n, d) => processAsNamedCall(n, d, n.lexeme, [n.variable, n.vector, n.body]),
	[RType.WhileLoop]:          (n, d) => processAsNamedCall(n, d, n.lexeme, [n.condition, n.body]),
	[RType.RepeatLoop]:         (n, d) => processAsNamedCall(n, d, n.lexeme, [n.body]),
	[RType.IfThenElse]:         (n, d) => processAsNamedCall(n, d, n.lexeme, [n.condition, n.then, n.otherwise]),
	[RType.Break]:              (n, d) => processAsNamedCall(n, d, n.lexeme, []),
	[RType.Next]:               (n, d) => processAsNamedCall(n, d, n.lexeme, []),
	[RType.FunctionCall]:       processFunctionCall,
	[RType.FunctionDefinition]: (n, d) => processAsNamedCall(n, d, n.lexeme, [...n.parameters, n.body]),
	[RType.Parameter]:          processFunctionParameter,
	[RType.Argument]:           processFunctionArgument,
	[RType.ExpressionList]:     (n, d) => processNamedCall({
		type:      RType.Symbol,
		info:      n.info,
		content:   n.grouping?.[0].content ?? '{',
		lexeme:    n.grouping?.[0].lexeme ?? '{',
		location:  n.location ?? rangeFrom(-1, -1, -1, -1),
		namespace: n.grouping?.[0].content ? undefined : 'base'
	}, wrapArgumentsUnnamed(n.children, d.completeAst.idMap), n.info.id, d)
}

export function produceDataFlowGraph<OtherInfo>(request: RParseRequest, ast: NormalizedAst<OtherInfo & ParentInformation>): DataflowInformation {
	return processDataflowFor<OtherInfo>(ast.ast, {
		completeAst:         ast,
		environment:         initializeCleanEnvironments(),
		processors,
		currentRequest:      request,
		controlDependencies: undefined,
		referenceChain:      [requestFingerprint(request)]
	})
}
