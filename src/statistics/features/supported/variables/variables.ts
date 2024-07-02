import type { Feature, FeatureProcessorInput } from '../../feature'
import type { Writable } from 'ts-essentials'
import { postProcess } from './post-process'
import { getRangeStart } from '../../../../util/range'
import { visitAst } from '../../../../r-bridge/lang-4.x/ast/model/processing/visitor'
import { RType } from '../../../../r-bridge/lang-4.x/ast/model/type'
import { isSpecialSymbol } from '../../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import { appendStatisticsFile } from '../../../output/statistics-file'


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

			const [dfNode] = mayNode
			if(dfNode.tag === 'variable-definition') {
				info.numberOfDefinitions++
				const lexeme = node.info.fullLexeme ?? node.lexeme
				appendStatisticsFile(variables.name, 'definedVariables', [[
					lexeme,
					getRangeStart(node.location)
				] satisfies DefinedVariableInformation ], input.filepath)
				// checking for redefinitions is no longer possible in its current form!
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
