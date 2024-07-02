import type { DataflowProcessorInformation } from '../../../../processor'
import { processDataflowFor } from '../../../../processor'
import type { DataflowInformation } from '../../../../info'
import { ExitPointType } from '../../../../info'
import { processAllArguments } from './common'
import type { RSymbol } from '../../../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import type { ParentInformation } from '../../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RFunctionArgument } from '../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { NodeId } from '../../../../../r-bridge/lang-4.x/ast/model/processing/node-id'
import type { RNode } from '../../../../../r-bridge/lang-4.x/ast/model/model'
import type { IdentifierReference } from '../../../../environments/identifier'
import { DataflowGraph } from '../../../../graph/graph'
import { EdgeType } from '../../../../graph/edge'
import { dataflowLogger } from '../../../../logger'
import { VertexType } from '../../../../graph/vertex'

export interface ProcessKnownFunctionCallInput<OtherInfo> {
	readonly name:          RSymbol<OtherInfo & ParentInformation>
	readonly args:          readonly (RNode<OtherInfo & ParentInformation> | RFunctionArgument<OtherInfo & ParentInformation>)[]
	readonly rootId:        NodeId
	readonly data:          DataflowProcessorInformation<OtherInfo & ParentInformation>
	/* should arguments be processed from right to left? This does not affect the order recorded in the call but of the environments */
	readonly reverseOrder?: boolean
	/** which arguments are to be marked as {@link EdgeType#NonStandardEvaluation|non-standard-evaluation}? */
	readonly markAsNSE?:    readonly number[]
	/* allows passing a data processor in-between each argument */
	readonly patchData?:    (data: DataflowProcessorInformation<OtherInfo & ParentInformation>, arg: number) => DataflowProcessorInformation<OtherInfo & ParentInformation>
}

export interface ProcessKnownFunctionCallResult {
	readonly information:        DataflowInformation
	readonly processedArguments: readonly (DataflowInformation | undefined)[]
	readonly fnRef:              IdentifierReference
}

export function markNonStandardEvaluationEdges(
	markAsNSE:  readonly number[] | undefined,
	callArgs:   readonly (DataflowInformation | undefined)[],
	finalGraph: DataflowGraph,
	rootId:     NodeId
) {
	if(markAsNSE === undefined) {
		return
	}
	for(const nse of markAsNSE) {
		if(nse < callArgs.length) {
			const arg = callArgs[nse]
			if(arg !== undefined) {
				finalGraph.addEdge(rootId, arg.entryPoint, { type: EdgeType.NonStandardEvaluation })
			}
		} else {
			dataflowLogger.warn(`Trying to mark argument ${nse} as non-standard-evaluation, but only ${callArgs.length} arguments are available`)
		}
	}
}

export function processKnownFunctionCall<OtherInfo>(
	{ name,args, rootId,data, reverseOrder = false, markAsNSE = undefined, patchData = d => d }: ProcessKnownFunctionCallInput<OtherInfo>
): ProcessKnownFunctionCallResult {
	const functionName = processDataflowFor(name, data)

	const finalGraph = new DataflowGraph(data.completeAst.idMap)
	const functionCallName = name.content
	dataflowLogger.debug(`Using ${rootId} (name: ${functionCallName}) as root for the named function call`)

	const processArgs = reverseOrder ? [...args].reverse() : args

	const {
		finalEnv,
		callArgs,
		remainingReadInArgs,
		processedArguments
	} = processAllArguments<OtherInfo>({ functionName, args: processArgs, data, finalGraph, functionRootId: rootId, patchData })
	markNonStandardEvaluationEdges(markAsNSE, processedArguments, finalGraph, rootId)

	finalGraph.addVertex({
		tag:                 VertexType.FunctionCall,
		id:                  rootId,
		environment:         data.environment,
		name:                functionCallName,
		/* will be overwritten accordingly */
		onlyBuiltin:         false,
		controlDependencies: data.controlDependencies,
		args:                reverseOrder ? [...callArgs].reverse() : callArgs
	})

	const inIds = remainingReadInArgs
	const fnRef = { nodeId: rootId, name: functionCallName, controlDependencies: data.controlDependencies, call: true as const }
	inIds.push(fnRef)

	return {
		information: {
			unknownReferences: [],
			in:                inIds,
			/* we do not keep the argument out as it has been linked by the function */
			out:               functionName.out,
			graph:             finalGraph,
			environment:       finalEnv,
			entryPoint:        rootId,
			exitPoints:        [{ nodeId: rootId, type: ExitPointType.Default, controlDependencies: data.controlDependencies }]
		},
		processedArguments: reverseOrder ? [...processedArguments].reverse() : processedArguments,
		fnRef
	}
}
