import type { NormalizedAst, DecoratedAstMap, NodeId, NoInfo, ParentInformation, RNodeWithParent } from '../../r-bridge'
import { RType } from '../../r-bridge'
import { slicerLogger } from '../static'
import type { SourcePosition } from '../../util/range'
import { expensiveTrace } from '../../util/log'

/** Either `line:column`, `line@variable-name`, or `$id` */
export type SingleSlicingCriterion = `${number}:${number}` | `${number}@${string}` | `$${number}`
export type SlicingCriteria = SingleSlicingCriterion[]

/**
 * Thrown if the given slicing criteria can not be found
 */
export class CriteriaParseError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'CriteriaParseError'
	}
}

/**
 * Takes a criterion in the form of `line:column` or `line@variable-name` and returns the corresponding node id
 */
export function slicingCriterionToId<OtherInfo = NoInfo>(criterion: SingleSlicingCriterion, decorated: NormalizedAst<OtherInfo & ParentInformation>): NodeId {
	let resolved: NodeId | undefined
	if(criterion.includes(':')) {
		const [line, column] = criterion.split(':').map(c => parseInt(c))
		resolved = locationToId([line, column], decorated.idMap)
	} else if(criterion.includes('@')) {
		const [line, name] = criterion.split(/@(.*)/s) // only split at first occurrence
		resolved = conventionalCriteriaToId(parseInt(line), name, decorated.idMap)
	} else if(criterion.startsWith('$')) {
		resolved = criterion.substring(1) as NodeId
	}

	if(resolved === undefined) {
		throw new CriteriaParseError(`invalid slicing criterion ${criterion}`)
	}
	return resolved
}



function locationToId<OtherInfo>(location: SourcePosition, dataflowIdMap: DecoratedAstMap<OtherInfo>): NodeId | undefined {
	let candidate: RNodeWithParent<OtherInfo> | undefined
	for(const [id, nodeInfo] of dataflowIdMap.entries()) {
		if(nodeInfo.location === undefined || nodeInfo.location[0] !== location[0] || nodeInfo.location[1] !== location[1]) {
			continue // only consider those with position information
		}

		expensiveTrace(slicerLogger, () => `can resolve id ${id} (${JSON.stringify(nodeInfo.location)}) for location ${JSON.stringify(location)}`)
		// function calls have the same location as the symbol they refer to, so we need to prefer the function call
		if(candidate !== undefined && nodeInfo.type !== RType.FunctionCall && nodeInfo.type !== RType.Argument || nodeInfo.type === RType.ExpressionList) {
			continue
		}

		candidate = nodeInfo
	}
	const id = candidate?.info.id
	if(id) {
		expensiveTrace(slicerLogger, () =>`resolve id ${id} (${JSON.stringify(candidate?.info)}) for location ${JSON.stringify(location)}`)
	}
	return id
}

function conventionalCriteriaToId<OtherInfo>(line: number, name: string, dataflowIdMap: DecoratedAstMap<OtherInfo>): NodeId | undefined {
	let candidate: RNodeWithParent<OtherInfo> | undefined

	for(const [id, nodeInfo] of dataflowIdMap.entries()) {
		if(nodeInfo.location === undefined || nodeInfo.location[0] !== line || nodeInfo.lexeme !== name) {
			continue
		}

		slicerLogger.trace(`can resolve id ${id} (${JSON.stringify(nodeInfo)}) for line ${line} and name ${name}`)
		// function calls have the same location as the symbol they refer to, so we need to prefer the function call
		if(candidate !== undefined && nodeInfo.type !== RType.FunctionCall && nodeInfo.type !== RType.Argument || nodeInfo.type === RType.ExpressionList) {
			continue
		}
		candidate = nodeInfo
	}
	const id = candidate?.info.id
	if(id) {
		slicerLogger.trace(`resolve id ${id} (${JSON.stringify(candidate?.info)}) for line ${line} and name ${name}`)
	}
	return id
}

export interface DecodedCriterion {
	criterion: SingleSlicingCriterion,
	id:        NodeId
}

export type DecodedCriteria = DecodedCriterion[]

export function convertAllSlicingCriteriaToIds(criteria: SlicingCriteria, decorated: NormalizedAst): DecodedCriteria {
	return criteria.map(l => ({ criterion: l, id: slicingCriterionToId(l, decorated) }))
}
