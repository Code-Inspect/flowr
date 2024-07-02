import type { Feature, FeatureProcessorInput } from '../../feature'
import type { Writable } from 'ts-essentials'
import type { CommonSyntaxTypeCounts } from '../../common-syntax-probability'
import {
	emptyCommonSyntaxTypeCounts,
	updateCommonSyntaxTypeCounts
} from '../../common-syntax-probability'
import { postProcess } from './post-process'
import { assertUnreachable, guard } from '../../../../util/assert'
import type { ParentInformation, RNodeWithParent } from '../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { NodeId } from '../../../../r-bridge/lang-4.x/ast/model/processing/node-id'
import { RType } from '../../../../r-bridge/lang-4.x/ast/model/type'
import { visitAst } from '../../../../r-bridge/lang-4.x/ast/model/processing/visitor'
import { RoleInParent, rolesOfParents } from '../../../../r-bridge/lang-4.x/ast/model/processing/role'
import { appendStatisticsFile } from '../../../output/statistics-file'
import type { RArgument } from '../../../../r-bridge/lang-4.x/ast/model/nodes/r-argument'
import { EmptyArgument } from '../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'

const initialDataAccessInfo = {
	// for the nth argument, how many of them are constant, etc.
	singleBracket: {
		// only counts if empty
		0: 0n,
		1: emptyCommonSyntaxTypeCounts()
	} as Record<number, bigint | CommonSyntaxTypeCounts>,
	doubleBracket: {
		// similar to single bracket
		0: 0n,
		1: emptyCommonSyntaxTypeCounts()
	} as Record<number, bigint | CommonSyntaxTypeCounts>,
	chainedOrNestedAccess: 0,
	longestChain:          0,
	deepestNesting:        0,
	byName:                0,
	bySlot:                0,
}

export type DataAccessInfo = Writable<typeof initialDataAccessInfo>

function classifyArguments(args: readonly (RArgument<ParentInformation> | typeof EmptyArgument | null | undefined)[], existing: Record<number, bigint | CommonSyntaxTypeCounts>) {
	if(args.length === 0) {
		(existing[0] as unknown as number)++
		return
	}

	let i = 1
	for(const arg of args) {
		if(arg === null || arg === undefined || arg === EmptyArgument) {
			(existing[0] as unknown as number)++
			continue
		}

		existing[i] = updateCommonSyntaxTypeCounts((existing[i] as CommonSyntaxTypeCounts | undefined) ?? emptyCommonSyntaxTypeCounts(), arg)
		i++
	}
}

function visitAccess(info: DataAccessInfo, input: FeatureProcessorInput): void {
	const accessNest: RNodeWithParent[] = []
	const accessChain: RNodeWithParent[] = []
	const parentRoleCache = new Map<NodeId, { acc: boolean, idxAcc: boolean }>()

	visitAst(input.normalizedRAst.ast,
		node => {
			if(node.type !== RType.Access) {
				return
			}

			const roles = rolesOfParents(node, input.normalizedRAst.idMap)

			let acc = false
			let idxAcc = false
			for(const role of roles) {
				if(role === RoleInParent.Accessed) {
					acc = true
					break // we only account for the first one
				} else if(role === RoleInParent.IndexAccess) {
					idxAcc = true
					break
				}
			}

			// here we have to check after the addition as we can only check the parental context
			if(acc) {
				accessChain.push(node)
				info.chainedOrNestedAccess++
				info.longestChain = Math.max(info.longestChain, accessChain.length)
			} else if(idxAcc) {
				accessNest.push(node)
				info.chainedOrNestedAccess++
				info.deepestNesting = Math.max(info.deepestNesting, accessNest.length)
			}
			parentRoleCache.set(node.info.id, { acc, idxAcc })


			if(accessNest.length === 0 && accessChain.length === 0) { // store topmost, after add as it must not be a child to do that
				appendStatisticsFile(dataAccess.name, 'dataAccess', [node.info.fullLexeme ?? node.lexeme], input.filepath)
			}

			const op = node.operator
			switch(op) {
				case '@': info.bySlot++;         return
				case '$': info.byName++;         return
				case '[':  classifyArguments(node.access, info.singleBracket); break
				case '[[': classifyArguments(node.access, info.doubleBracket); break
				default: assertUnreachable(op)
			}

			guard(Array.isArray(node.access), '[ and [[ must provide access as array')
		}, node => {
			// drop again :D
			if(node.type === RType.Access) {
				const ctx = parentRoleCache.get(node.info.id)
				if(ctx?.acc) {
					accessChain.pop()
				} else if(ctx?.idxAcc) {
					accessNest.pop()
				}

			}
		}
	)
}

export const dataAccess: Feature<DataAccessInfo> = {
	name:        'Data Access',
	description: 'Ways of accessing data structures in R',

	process(existing: DataAccessInfo, input: FeatureProcessorInput): DataAccessInfo {
		visitAccess(existing, input)
		return existing
	},
	initialValue: initialDataAccessInfo,
	postProcess:  postProcess
}
