import { Feature, FeatureInfo, FeatureProcessorInput, Query } from '../feature'
import * as xpath from 'xpath-ts2'
import { append } from '../../output'

export interface LoopInfo extends FeatureInfo {
	forLoops:        number
	whileLoops:      number
	repeatLoops:     number
	breakStatements: number
	nextStatements:  number
}

const initialLoopInfo = (): LoopInfo => ({
	forLoops:        0,
	whileLoops:      0,
	repeatLoops:     0,
	breakStatements: 0,
	nextStatements:  0,
	/** apply, tapply, lapply, ...*/
	implicitLoops:   0
})


const forLoopQuery: Query = xpath.parse(`//FOR`)
const whileLoopQuery: Query = xpath.parse(`//WHILE`)
const repeatLoopQuery: Query = xpath.parse(`//REPEAT`)
const breakStatementQuery: Query = xpath.parse(`//BREAK`)
const nextStatementQuery: Query = xpath.parse(`//NEXT`)
const implicitLoopQuery: Query = xpath.parse(`//SYMBOL_FUNCTION_CALL[
     text() = 'apply' 
  or text() = 'lapply' 
  or text() = 'sapply' 
  or text() = 'tapply' 
  or text() = 'mapply' 
  or text() = 'vapply'
]`)

export const loops: Feature<LoopInfo> = {
	name:        'Loops',
	description: 'All looping structures in the document',

	process(existing: LoopInfo, input: FeatureProcessorInput): LoopInfo {
		const forLoops = forLoopQuery.select({ node: input.parsedRAst })
		const whileLoops = whileLoopQuery.select({ node: input.parsedRAst })
		const repeatLoops = repeatLoopQuery.select({ node: input.parsedRAst })
		const breakStatements = breakStatementQuery.select({ node: input.parsedRAst })
		const nextStatements = nextStatementQuery.select({ node: input.parsedRAst })
		const implicitLoops = implicitLoopQuery.select({ node: input.parsedRAst })

		existing.forLoops += forLoops.length
		existing.whileLoops += whileLoops.length
		existing.repeatLoops += repeatLoops.length
		existing.breakStatements += breakStatements.length
		existing.nextStatements += nextStatements.length
		existing.implicitLoops += implicitLoops.length
		append(this.name, 'implicit-loops', implicitLoops, input.filepath)
		return existing
	},

	initialValue: initialLoopInfo
}
