import type { Feature, FeatureProcessorInput } from '../../feature'
import type { Writable } from 'ts-essentials'
import type { NodeId } from '../../../../r-bridge'
import { isSpecialSymbol, RType, visitAst } from '../../../../r-bridge'
import { appendStatisticsFile } from '../../../output'
import { EdgeType } from '../../../../dataflow'
import { postProcess } from './post-process'
import { getRangeStart } from '../../../../util/range'


const initialVariableInfo = {
	numberOfVariableUses:  0,
	numberOfDefinitions:   0,
	numberOfRedefinitions: 0,
	// we failed to get the type/role, maybe for function call names etc.
	unknownVariables:      0
}

export type VariableInfo = Writable<typeof initialVariableInfo>


export type DefinedVariableInformation = [
	name: string,
	location: [line: number, character: number]
]

function visitVariables(info: VariableInfo, input: FeatureProcessorInput): void {

	// same-def-def edges are bidirectional, we want to avoid counting them twice!
	const redefinedBlocker = new Set<NodeId>()

	visitAst(input.normalizedRAst.ast,
		node => {
			if(node.type !== RType.Symbol || isSpecialSymbol(node)) {
				return
			}

			// search for the node in the DF graph
			const mayNode = input.dataflow.graph.get(node.info.id)

			if(mayNode === undefined) {
				info.unknownVariables++
				appendStatisticsFile(variables.name, 'unknown', [[
					node.info.fullLexeme ?? node.lexeme,
					getRangeStart(node.location)
				] satisfies DefinedVariableInformation ], input.filepath)
				return
			}

			const [dfNode, edges] = mayNode
			if(dfNode.tag === 'variable-definition') {
				info.numberOfDefinitions++
				const lexeme = node.info.fullLexeme ?? node.lexeme
				appendStatisticsFile(variables.name, 'definedVariables', [[
					lexeme,
					getRangeStart(node.location)
				] satisfies DefinedVariableInformation ], input.filepath)
				// check for redefinitions
				const hasRedefinitions = [...edges.entries()].some(([target, edge]) => !redefinedBlocker.has(target) && edge.types.has(EdgeType.SameDefDef))
				if(hasRedefinitions) {
					info.numberOfRedefinitions++
					redefinedBlocker.add(node.info.id)
					appendStatisticsFile(variables.name, 'redefinedVariables', [[
						lexeme,
						getRangeStart(node.location)
					] satisfies DefinedVariableInformation ], input.filepath)
				}
			} else if(dfNode.tag === 'use') {
				info.numberOfVariableUses++
				appendStatisticsFile(variables.name, 'usedVariables', [[
					node.info.fullLexeme ?? node.lexeme,
					getRangeStart(node.location)
				] satisfies DefinedVariableInformation ], input.filepath)
			}
		}
	)
}


export const variables: Feature<VariableInfo> = {
	name:        'Variables',
	description: 'Variable Usage, Assignments, and Redefinitions',

	process(existing: VariableInfo, input: FeatureProcessorInput): VariableInfo {
		visitVariables(existing, input)
		return existing
	},

	initialValue: initialVariableInfo,
	postProcess:  postProcess
}
