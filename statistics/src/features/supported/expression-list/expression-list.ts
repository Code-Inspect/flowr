import type { Writable } from 'ts-essentials'
import type { Feature, FeatureProcessorInput } from '../../feature'
import { RType, visitAst } from '@eagleoutice/flowr/r-bridge'
import { postProcess } from './post-process'

const initialExpressionListInfo = {
	allExpressionLists: 0,
	deepestNesting:     0
}
export type ExpressionListInfo = Writable<typeof initialExpressionListInfo>

function visitLists(info: ExpressionListInfo, input: FeatureProcessorInput): void {
	let nest = -1 // we start with nesting 0
	let total = 0

	visitAst(input.normalizedRAst.ast,
		node => {
			if(node.type === RType.ExpressionList) {
				nest++
				total++
				info.deepestNesting = Math.max(info.deepestNesting, nest)
			}
		}, node => {
			if(node.type === RType.ExpressionList) {
				nest--
			}
		}
	)

	info.allExpressionLists += total
}

export const expressionList: Feature<ExpressionListInfo> = {
	name:        'Expression Lists',
	description: 'Counts expression list nestings',

	process(existing: ExpressionListInfo, input: FeatureProcessorInput): ExpressionListInfo {
		visitLists(existing, input)
		return existing
	},

	initialValue: initialExpressionListInfo,
	postProcess:  postProcess
}
