import type { Feature, FeatureProcessorInput } from '../../feature'
import type { Writable } from 'ts-essentials'
import { emptyCommonSyntaxTypeCounts, updateCommonSyntaxTypeCounts } from '../../common-syntax-probability'
import type {
	RNodeWithParent
} from '../../../../r-bridge'
import {
	OperatorDatabase
	,
	RType,
	visitAst
} from '../../../../r-bridge'
import { postProcess } from './post-process'


const initialAssignmentInfo = {
	// operator to occurrence count
	assignmentOperator:       {} as Record<string, bigint>,
	assigned:                 emptyCommonSyntaxTypeCounts(),
	// find combinations like `` is most often used for functions?
	deepestNesting:           0,
	nestedOperatorAssignment: 0
}

export type AssignmentInfo = Writable<typeof initialAssignmentInfo>


function visitAssignment(info: AssignmentInfo, input: FeatureProcessorInput): void {
	const assignmentStack: RNodeWithParent[] = []

	visitAst(input.normalizedRAst.ast,
		node => {
			if(node.type !== RType.BinaryOp || OperatorDatabase[node.operator].usedAs !== 'assignment') {
				return
			}

			if(assignmentStack.length > 0) {
				info.nestedOperatorAssignment++
				info.deepestNesting = Math.max(info.deepestNesting, assignmentStack.length)
			}

			assignmentStack.push(node)

			info.assignmentOperator[node.operator] = ((info.assignmentOperator[node.operator] as bigint | undefined) ?? 0n) + 1n

			switch(node.operator) {
				case '->':
				case '->>':
					info.assigned = updateCommonSyntaxTypeCounts(info.assigned, node.lhs)
					break
				default:
					info.assigned = updateCommonSyntaxTypeCounts(info.assigned, node.rhs)
					break
			}

		}, node => {
			// drop again :D
			if(node.type === RType.BinaryOp && node.flavor === 'assignment') {
				assignmentStack.pop()
			}
		}
	)
}

export const assignments: Feature<AssignmentInfo> = {
	name:        'Assignments',
	description: 'all ways to assign something in R',

	process(existing: AssignmentInfo, input: FeatureProcessorInput): AssignmentInfo {
		visitAssignment(existing, input)
		return existing
	},

	initialValue: initialAssignmentInfo,
	postProcess:  postProcess
}
