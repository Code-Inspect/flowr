import {
	EmptyArgument } from '../../../../../../r-bridge'
import type {
	NodeId,
	ParentInformation,
	RFunctionArgument,
	RSymbol
	, type RArgument
} from '../../../../../../r-bridge'
import type { DataflowProcessorInformation } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import { initializeCleanDataflowInformation } from '../../../../../info'
import type { IdentifierReference } from '../../../../../index'
import { dataflowLogger, makeAllMaybe } from '../../../../../index'
import { processKnownFunctionCall } from '../known-call-handling'
import { expensiveTrace } from '../../../../../../util/log'
import { processAssignment } from './built-in-assignment'
import { processAllArguments } from '../common'
import { guard } from '../../../../../../util/assert'

function isNotEmpty(a: RFunctionArgument<ParentInformation>): a is RArgument<ParentInformation> {
	return a !== EmptyArgument
}

export function processReplacementFunction<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	/** last one has to be the value */
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>,
	config: { makeMaybe?: boolean, assignmentOperator?: '<-' | '<<-' }
): DataflowInformation {
	if(args.length < 2) {
		dataflowLogger.warn(`Replacement ${name.content} has less than 2 arguments, skipping`)
		return processKnownFunctionCall(name, args, rootId, data).information
	}

	/* we only get here if <-, <<-, ... or whatever is part of the replacement is not overwritten */
	expensiveTrace(dataflowLogger, () => `Replacement ${name.content} with ${JSON.stringify(args)}, processing`)

	/* we assign the first argument by the last for now and maybe mark as maybe!, we can keep the symbol as we now know we have an assignment */
	const res = processAssignment(name, [args[0], args[args.length - 1]], rootId, data, { superAssignment: config.assignmentOperator === '<<-' })

	/* now, we soft-inject other arguments, so that calls like `x[y] <- 3` are linked correctly */
	const { callArgs } = processAllArguments(initializeCleanDataflowInformation(data), args.slice(1, -1), data, res.graph, rootId)
	const fn = res.graph.get(rootId)
	guard(fn !== undefined && fn[0].tag === 'function-call' && fn[0].args.length === 2, () => `Function ${rootId} not found in graph or not 2-arg fn-call (${JSON.stringify(fn)})`)
	fn[0].args = [fn[0].args[0], ...callArgs, fn[0].args[1]]


	if(config.makeMaybe) {
		// we ignore the value
		const targetArgReferences: IdentifierReference[] = args.slice(0,-1).filter(isNotEmpty).map(a => ({
			nodeId:            (a as RArgument<ParentInformation>).info.id,
			name:              (a as RArgument<ParentInformation>).name?.content,
			controlDependency: data.controlDependency
		}))
		// TODO: patch func args as well
		makeAllMaybe(targetArgReferences, res.graph, res.environment, true)
	}

	return res
}

