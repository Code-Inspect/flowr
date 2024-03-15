import type { NodeId, ParentInformation, RFunctionArgument, RSymbol } from '../../../../../../r-bridge'
import { RType, EmptyArgument } from '../../../../../../r-bridge'
import type { DataflowProcessorInformation } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import { makeAllMaybe, makeReferenceMaybe } from '../../../../../environments'
import { dataflowLogger, EdgeType } from '../../../../../index'
import { guard } from '../../../../../../util/assert'
import { processKnownFunctionCall } from '../known-call-handling'

export function processAccess<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>,
	config: { treatIndicesAsString: boolean }
): DataflowInformation {
	if(args.length < 2) {
		dataflowLogger.warn(`Access ${name.content} has less than 2 arguments, skipping`)
		return processKnownFunctionCall(name, args, rootId, data).information
	}
	const head = args[0]
	guard(head !== EmptyArgument, () => `Access ${name.content} has no source, impossible!`)

	let information: DataflowInformation
	if(!config.treatIndicesAsString) {
		information = processKnownFunctionCall(name, args, rootId, data).information
	} else {
		const newArgs = [...args]
		// if the argument is a symbol we convert it to a string for this perspective
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
		information = processKnownFunctionCall(name, newArgs, rootId, data).information
	}

	information.graph.addEdge(name.info.id, head.info.id, { type: EdgeType.Returns })

	return {
		...information,
		/*
     * keep active nodes in case of assignments etc.
     * We make them maybe as a kind of hack.
     * This way when using
     * ```ts
     * a[[1]] <- 3
     * a[[2]] <- 4
     * a
     * ```
     * the read for a will use both accesses as potential definitions and not just the last one!
     */
		unknownReferences: makeAllMaybe(information.unknownReferences, information.graph, information.environment, false),
		/** it is, to be precise, the accessed element we want to map to maybe */
		in:                information.in.map(ref => {
			if(ref.nodeId === head.value?.info.id) {
				return makeReferenceMaybe(ref, information.graph, information.environment, false)
			} else {
				return ref
			}
		})
	}
}
