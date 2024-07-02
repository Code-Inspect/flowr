import type { DataflowProcessorInformation } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import { guard } from '../../../../../../util/assert'
import type { ProcessKnownFunctionCallResult } from '../known-call-handling'
import { processKnownFunctionCall } from '../known-call-handling'
import type { ParentInformation } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RFunctionArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import { EmptyArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { RSymbol } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import type { NodeId } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/node-id'
import { dataflowLogger } from '../../../../../logger'
import { RType } from '../../../../../../r-bridge/lang-4.x/ast/model/type'
import { EdgeType } from '../../../../../graph/edge'
import { makeAllMaybe, makeReferenceMaybe } from '../../../../../environments/environment'

export function processAccess<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>,
	config: { treatIndicesAsString: boolean }
): DataflowInformation {
	if(args.length < 2) {
		dataflowLogger.warn(`Access ${name.content} has less than 2 arguments, skipping`)
		return processKnownFunctionCall({ name, args, rootId, data }).information
	}
	const head = args[0]
	guard(head !== EmptyArgument, () => `Access ${name.content} has no source, impossible!`)

	let fnCall: ProcessKnownFunctionCallResult
	if(!config.treatIndicesAsString) {
		fnCall = processKnownFunctionCall({ name, args, rootId, data })
	} else {
		const newArgs = [...args]
		// if the argument is a symbol, we convert it to a string for this perspective
		for(let i = 1; i < newArgs.length; i++) {
			const arg = newArgs[i]
			if(arg !== EmptyArgument && arg.value?.type === RType.Symbol) {
				newArgs[i] = {
					...arg,
					value: {
						type:     RType.String,
						info:     arg.value.info,
						lexeme:   arg.value.lexeme,
						location: arg.value.location,
						content:  {
							quotes: 'none',
							str:    arg.value.lexeme
						}
					}
				}
			}
		}
		fnCall = processKnownFunctionCall({ name, args: newArgs, rootId, data })
	}

	const info = fnCall.information

	info.graph.addEdge(name.info.id, fnCall.processedArguments[0]?.entryPoint ?? head.info.id, { type: EdgeType.Returns })

	/* access always reads all of its indices */
	for(const arg of fnCall.processedArguments) {
		if(arg !== undefined) {
			info.graph.addEdge(name.info.id, arg.entryPoint, { type: EdgeType.Reads })
		}
		if(config.treatIndicesAsString) {
			// everything but the first is disabled here
			break
		}
	}

	return {
		...info,
		/*
     * Keep active nodes in case of assignments etc.
     * We make them maybe as a kind of hack.
     * This way when using
     * ```ts
     * a[[1]] <- 3
     * a[[2]] <- 4
     * a
     * ```
     * the read for a will use both accesses as potential definitions and not just the last one!
     */
		unknownReferences: makeAllMaybe(info.unknownReferences, info.graph, info.environment, false),
		entryPoint:        rootId,
		/** it is, to be precise, the accessed element we want to map to maybe */
		in:                info.in.map(ref => {
			if(ref.nodeId === head.value?.info.id) {
				return makeReferenceMaybe(ref, info.graph, info.environment, false)
			} else {
				return ref
			}
		})
	}
}
