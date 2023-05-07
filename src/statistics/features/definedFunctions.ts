import { Feature, formatMap } from '../feature'
import * as xpath from 'xpath-ts2'
import { MergeableRecord } from '../../util/objects'
import { groupCount } from '../../util/arrays'

export type FunctionNameInfo = string

export interface FunctionDefinitionInfo extends MergeableRecord {
  // TODO: scoping/namespaces?
  // TODO: local/global functions etc.
  /** all, anonymous, assigned, non-assigned, ... */
  total:             number
  /** how many are really using OP-Lambda? */
  lambdasOnly:       number
  /** using `<<-`, `<-`, `=`, `->` `->>` */
  assignedFunctions: FunctionNameInfo[]
}

export const initialFunctionDefinitionInfo = (): FunctionDefinitionInfo => ({
  total:             0,
  lambdasOnly:       0,
  assignedFunctions: []
})

// TODO: note that this can not work with assign, setGeneric and so on for now
// TODO: is it fater to wrap with count?
export const queryAnyFunctionDefinition = xpath.parse(`//FUNCTION`)
export const queryAnyLambdaDefinition = xpath.parse(`//OP-LAMBDA`)

// we do not care on how these functions are defined
export const queryAssignedFunctionDefinitions = xpath.parse(`
  //LEFT_ASSIGN[following-sibling::expr/*[self::FUNCTION or self::OP-LAMBDA]]/preceding-sibling::expr[count(*)=1]/SYMBOL
  |
  //EQ_ASSIGN[following-sibling::expr/*[self::FUNCTION or self::OP-LAMBDA]]/preceding-sibling::expr[count(*)=1]/SYMBOL
  |
  //RIGHT_ASSIGN[preceding-sibling::expr/*[self::FUNCTION or self::OP-LAMBDA]]/following-sibling::expr[count(*)=1]/SYMBOL
`)

export const definedFunctions: Feature<FunctionDefinitionInfo> = {
  name:        'defined functions',
  description: 'all functions defined within the document',

  append(existing: FunctionDefinitionInfo, input: Document): FunctionDefinitionInfo {
    const allFunctions = queryAnyFunctionDefinition.select({ node: input })
    const allLambdas = queryAnyLambdaDefinition.select({ node: input })

    existing.total += allFunctions.length + allLambdas.length
    existing.lambdasOnly += allLambdas.length

    const assignedFunctions = queryAssignedFunctionDefinitions.select({ node: input })
    existing.assignedFunctions.push(...new Set(assignedFunctions.map(node => node.textContent ?? '<unknown>')))
    return existing
  },

  toString(data: FunctionDefinitionInfo): string {
    const groupedAssignedFunctions = groupCount(data.assignedFunctions)
    return `---defined functions------------
\ttotal: ${data.total} (of which ${data.lambdasOnly} are lambdas)
\tfunctions defined: ${groupedAssignedFunctions.size}${formatMap(groupedAssignedFunctions)}
`
  }

}
