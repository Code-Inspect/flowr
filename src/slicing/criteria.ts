import { DecoratedAst, DecoratedAstMap, NodeId, NoInfo, ParentInformation, RNodeWithParent, Type } from '../r-bridge'
import { slicerLogger } from './static'
import { SourcePosition } from '../util/range'

/** Either `line:column`, `line@variable-name`, or `$id` */
export type SlicingCriterion = `${number}:${number}` | `${number}@${string}` | `${number}`

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
export function slicingCriterionToId<OtherInfo = NoInfo>(criterion: SlicingCriterion, decorated: DecoratedAst<OtherInfo & ParentInformation>): NodeId {
  let resolved: NodeId | undefined
  if(criterion.includes(':')) {
    const [line, column] = criterion.split(':').map(c => parseInt(c))
    resolved = locationToId({ line, column }, decorated.idMap)
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
    if(nodeInfo.location === undefined || nodeInfo.location.start.line !== location.line || nodeInfo.location.start.column !== location.column) {
      continue // only consider those with position information
    }

    slicerLogger.trace(`can resolve id ${id} (${JSON.stringify(nodeInfo)}) for location ${JSON.stringify(location)}`)
    // function calls have the same location as the symbol they refer to, so we need to prefer the function call
    if(candidate !== undefined && nodeInfo.type !== Type.FunctionCall && nodeInfo.type !== Type.Argument || nodeInfo.type === Type.ExpressionList) {
      continue
    }

    candidate = nodeInfo
  }
  const id = candidate?.info.id
  if(id) {
    slicerLogger.trace(`resolve id ${id} (${JSON.stringify(candidate?.info)}) for location ${JSON.stringify(location)}`)
  }
  return id
}

function conventionalCriteriaToId<OtherInfo>(line: number, name: string, dataflowIdMap: DecoratedAstMap<OtherInfo>): NodeId | undefined {
  let candidate: RNodeWithParent<OtherInfo> | undefined

  for(const [id, nodeInfo] of dataflowIdMap.entries()) {
    if(nodeInfo.location === undefined || nodeInfo.location.start.line !== line || nodeInfo.lexeme !== name) {
      continue
    }

    slicerLogger.trace(`can resolve id ${id} (${JSON.stringify(nodeInfo)}) for line ${line} and name ${name}`)
    // function calls have the same location as the symbol they refer to, so we need to prefer the function call
    if(candidate !== undefined && nodeInfo.type !== Type.FunctionCall && nodeInfo.type !== Type.Argument || nodeInfo.type === Type.ExpressionList) {
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
