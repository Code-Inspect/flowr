import type { NodeId, ParentInformation, RAssignmentOp, RNode } from '../../../../r-bridge'
import { collectAllIds, RType } from '../../../../r-bridge'
import type { DataflowInformation } from '../../info'
import type { DataflowProcessorInformation } from '../../../processor'
import { processDataflowFor } from '../../../processor'
import { EdgeType } from '../../../graph'
import type {
	IdentifierDefinition,
	IdentifierReference } from '../../../environments'
import {
	define,
	overwriteEnvironments
} from '../../../environments'
import { log } from '../../../../util/log'
import { dataflowLogger } from '../../../index'
import { GlobalScope, LocalScope } from '../../../environments/scopes'

export function processAssignment<OtherInfo>(op: RAssignmentOp<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo & ParentInformation>): DataflowInformation {
	dataflowLogger.trace(`Processing assignment with id ${op.info.id}`)
	const lhs = processDataflowFor(op.lhs, data)
	const rhs = processDataflowFor(op.rhs, data)
	const { readTargets, newWriteNodes, writeTargets, environments, swap } = processReadAndWriteForAssignmentBasedOnOp(op, lhs, rhs, data)
	const nextGraph = lhs.graph.mergeWith(rhs.graph)

	// deal with special cases based on the source node and the determined read targets

	const isFunctionSide = swap ? op.lhs : op.rhs
	const isFunction = isFunctionSide.type === RType.FunctionDefinition

	for(const write of newWriteNodes) {
		nextGraph.setDefinitionOfVertex(write)

		if(isFunction) {
			nextGraph.addEdge(write, isFunctionSide.info.id, EdgeType.DefinedBy, 'always', true)
		} else {
			const impactReadTargets = determineImpactOfSource(swap ? op.lhs : op.rhs, readTargets)

			for(const read of impactReadTargets) {
				nextGraph.addEdge(write, read, EdgeType.DefinedBy, undefined, true)
			}
		}
	}
	return {
		unknownReferences: [],
		in:                readTargets,
		out:               writeTargets,
		graph:             nextGraph,
		environments,
		scope:             data.activeScope
	}
}

interface SourceAndTarget {
	source: DataflowInformation
	target: DataflowInformation
	global: boolean
	/** true if `->` or `->>` */
	swap:   boolean
}

function identifySourceAndTarget<OtherInfo>(
	op: RNode<OtherInfo & ParentInformation>,
	lhs: DataflowInformation,
	rhs: DataflowInformation
) : SourceAndTarget {
	let source: DataflowInformation
	let target: DataflowInformation
	let global = false
	let swap = false

	switch(op.lexeme) {
		case '<-':
		case '=':
		case ':=':
			[target, source] = [lhs, rhs]
			break
		case '<<-':
			[target, source, global] = [lhs, rhs, true]
			break
		case '->':
			[target, source, swap] = [rhs, lhs, true]
			break
		case '->>':
			[target, source, global, swap] = [rhs, lhs, true, true]
			break
		default:
			throw new Error(`Unknown assignment operator ${JSON.stringify(op)}`)
	}
	return { source, target, global, swap }
}

function produceWrittenNodes<OtherInfo>(op: RAssignmentOp<OtherInfo & ParentInformation>, target: DataflowInformation, global: boolean, data: DataflowProcessorInformation<OtherInfo & ParentInformation>, functionTypeCheck: RNode<ParentInformation>): IdentifierDefinition[] {
	const writeNodes: IdentifierDefinition[] = []
	const isFunctionDef = functionTypeCheck.type === RType.FunctionDefinition
	for(const active of target.unknownReferences) {
		writeNodes.push({
			...active,
			scope:     global ? GlobalScope : data.activeScope,
			kind:      isFunctionDef ? 'function' : 'variable',
			definedAt: op.info.id
		})
	}
	return writeNodes
}

function processReadAndWriteForAssignmentBasedOnOp<OtherInfo>(
	op: RAssignmentOp<OtherInfo & ParentInformation>,
	lhs: DataflowInformation, rhs: DataflowInformation,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>
) {
	// what is written/read additionally is based on lhs/rhs - assignments read written variables as well
	const read = [...lhs.in, ...rhs.in]
	const { source, target, global, swap } = identifySourceAndTarget(op, lhs, rhs)

	const funcTypeCheck = swap ? op.lhs : op.rhs

	const writeNodes = produceWrittenNodes(op, target, global, data, funcTypeCheck)

	if(writeNodes.length !== 1) {
		log.warn(`Unexpected write number in assignment: ${JSON.stringify(writeNodes)}`)
	}

	const readFromSourceWritten = source.out
	let environments = overwriteEnvironments(source.environments, target.environments)

	// install assigned variables in environment
	for(const write of writeNodes) {
		environments = define(write, global ? GlobalScope: LocalScope, environments)
	}

	return {
		readTargets:   [...source.unknownReferences, ...read, ...readFromSourceWritten],
		writeTargets:  [...writeNodes, ...target.out, ...readFromSourceWritten],
		environments:  environments,
		newWriteNodes: writeNodes,
		swap
	}
}

/**
 * Some R-constructs like loops are known to return values completely independent of their input (loops return an invisible `NULL`).
 * This returns only those of `readTargets` that actually impact the target.
 */
function determineImpactOfSource<OtherInfo>(source: RNode<OtherInfo & ParentInformation>, readTargets: IdentifierReference[]): Set<IdentifierReference> {
	// collect all ids from the source but stop at Loops, function calls, definitions and everything which links its own return
	// for loops this is necessary as they *always* return an invisible null, for function calls we do not know if they do
	// yet, we need to keep the ids of these elements
	const keepEndIds: NodeId[] = []
	const allIds = new Set(collectAllIds(source, n => {
		if(n.type === RType.FunctionCall || n.type === RType.FunctionDefinition) {
			keepEndIds.push(n.info.id)
			return true
		}
		return n.type === RType.ForLoop || n.type === RType.WhileLoop || n.type === RType.RepeatLoop
	})
	)
	for(const id of keepEndIds) {
		allIds.add(id)
	}
	if(allIds.size === 0) {
		return new Set()
	} else {
		return new Set(readTargets.filter(ref => allIds.has(ref.nodeId)))
	}
}
