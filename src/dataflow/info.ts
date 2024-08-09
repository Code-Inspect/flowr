import type { DataflowProcessorInformation } from './processor'
import type { NodeId } from '../r-bridge/lang-4.x/ast/model/processing/node-id'
import type { IdentifierReference } from './environments/identifier'
import type { REnvironmentInformation } from './environments/environment'
import { DataflowGraph } from './graph/graph'
import type { GenericDifferenceInformation, WriteableDifferenceReport } from '../util/diff'

export const enum ExitPointType {
	Default = 0,
	Return = 1,
	Break = 2,
	Next = 3
}

export interface ControlDependency {
	readonly id:    NodeId,
	/** when does this control dependency trigger (if the condition is true or false)? */
	readonly when?: boolean
}


export interface ExitPoint {
	readonly type:                ExitPointType,
	readonly nodeId:              NodeId,
	readonly controlDependencies: ControlDependency[] | undefined
}

export function addNonDefaultExitPoints(existing: ExitPoint[], add: readonly ExitPoint[]): void {
	existing.push(...add.filter(({ type }) => type !== ExitPointType.Default))
}

/**
 * The control flow information for the current {@link DataflowInformation}.
 */
export interface DataflowCfgInformation {
	/**
	 * The entry node into the subgraph
	 */
	entryPoint: NodeId,
	/**
	 * All already identified exit points (active 'return'/'break'/'next'-likes) of the respective structure.
	 */
	exitPoints: readonly ExitPoint[]
}

/**
 * The dataflow information is continuously updated during the dataflow analysis
 * and holds its current state for the respective subtree processed.
 */
export interface DataflowInformation extends DataflowCfgInformation {
	/** References that have not been identified as read or write and will be so on higher */
	unknownReferences: readonly IdentifierReference[]
	/** References which are read */
	in:                readonly IdentifierReference[]
	/** References which are written to */
	out:               readonly IdentifierReference[]
	/** Current environments used for name resolution, probably updated on the next expression-list processing */
	environment:       REnvironmentInformation
	/** The current constructed dataflow graph */
	graph:             DataflowGraph
}

export function initializeCleanDataflowInformation<T>(entryPoint: NodeId, data: Pick<DataflowProcessorInformation<T>, 'environment' | 'completeAst'>): DataflowInformation {
	return {
		unknownReferences: [],
		in:                [],
		out:               [],
		environment:       data.environment,
		graph:             new DataflowGraph(data.completeAst.idMap),
		entryPoint,
		exitPoints:        [{ nodeId: entryPoint, type: ExitPointType.Default, controlDependencies: undefined }]
	}
}

export function happensInEveryBranch(controlDependencies: ControlDependency[] | undefined): boolean {
	if(controlDependencies === undefined) {
		/* the cds are unconstrained */
		return true
	} else if(controlDependencies.length === 0) {
		/* this happens only when we have no idea and require more analysis */
		return false
	}

	const trues = []
	const falseSet = new Set()

	for(const { id, when } of controlDependencies) {
		if(when) {
			trues.push(id)
		} else {
			falseSet.add(id)
		}
	}

	return trues.every(id => falseSet.has(id))
}

export function alwaysExits(data: DataflowInformation): boolean {
	return data.exitPoints?.some(
		e => e.type !== ExitPointType.Default && happensInEveryBranch(e.controlDependencies)
	) ?? false
}

export function filterOutLoopExitPoints(exitPoints: readonly ExitPoint[]): readonly ExitPoint[] {
	return exitPoints.filter(({ type }) => type === ExitPointType.Return || type === ExitPointType.Default)
}

export function diffControlDependency<Report extends WriteableDifferenceReport>(a: ControlDependency | undefined, b: ControlDependency | undefined, info: GenericDifferenceInformation<Report>): void {
	if(a === undefined || b === undefined) {
		if(a !== b) {
			info.report.addComment(`${info.position}Different control dependencies. ${info.leftname}: ${JSON.stringify(a)} vs. ${info.rightname}: ${JSON.stringify(b)}`)
		}
		return
	}
	if(a.id !== b.id) {
		info.report.addComment(`${info.position}Different control dependency ids. ${info.leftname}: ${a.id} vs. ${info.rightname}: ${b.id}`)
	}
	if(a.when !== b.when) {
		info.report.addComment(`${info.position}Different control dependency when. ${info.leftname}: ${a.when} vs. ${info.rightname}: ${b.when}`)
	}
}

export function diffControlDependencies<Report extends WriteableDifferenceReport>(a: ControlDependency[] | undefined, b: ControlDependency[] | undefined, info: GenericDifferenceInformation<Report>): void {
	if(a === undefined || b === undefined) {
		if(a !== b) {
			info.report.addComment(`${info.position}Different control dependencies: ${JSON.stringify(a)} vs. ${JSON.stringify(b)}`)
		}
		return
	}
	if(a.length !== b.length) {
		info.report.addComment(`${info.position}Different control dependency lengths: ${a.length} vs. ${b.length}`)
	}
	for(let i = 0; i < a.length; ++i) {
		diffControlDependency(a[i], b[i], { ...info, position: `${info.position}Control dependency at index: ${i}: ` })
	}
}
