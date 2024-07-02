import type { Feature, FeatureProcessorInput } from '../../feature'
import type { Writable } from 'ts-essentials'
import { postProcess } from './post-process'
import type { MergeableRecord } from '../../../../util/objects'
import type { SourcePosition } from '../../../../util/range'
import { getRangeStart } from '../../../../util/range'
import { guard, isNotUndefined } from '../../../../util/assert'
import type { RFunctionDefinition } from '../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-definition'
import type { ParentInformation, RNodeWithParent } from '../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import { edgeIncludesType, EdgeType } from '../../../../dataflow/graph/edge'
import { RType } from '../../../../r-bridge/lang-4.x/ast/model/type'
import { visitAst } from '../../../../r-bridge/lang-4.x/ast/model/processing/visitor'
import { appendStatisticsFile } from '../../../output/statistics-file'
import { VertexType } from '../../../../dataflow/graph/vertex'

const initialFunctionDefinitionInfo = {
	/** all, anonymous, assigned, non-assigned, ... */
	total:             0,
	/** how many are really using OP-Lambda? */
	lambdasOnly:       0,
	/** using `<<-`, `<-`, `=`, `->` `->>` */
	assignedFunctions: 0,
	nestedFunctions:   0,
	/** functions that in some easily detectable way call themselves */
	recursive:         0,
	deepestNesting:    0
}

export type FunctionDefinitionInfo = Writable<typeof initialFunctionDefinitionInfo>

export const AllDefinitionsFileBase = 'all-definitions'

export interface SingleFunctionDefinitionInformation extends MergeableRecord {
	location:           SourcePosition,
	/** locations of all direct call sites */
	callsites:          SourcePosition[],
	numberOfParameters: number,
	// for each return site, currently unable to classify if it is implicit or explicit (i.e., with return)
	returns:            { location: SourcePosition }[],
	length:   {
		lines:                   number,
		characters:              number,
		nonWhitespaceCharacters: number
	}
}


function retrieveAllCallsites(input: FeatureProcessorInput, node: RFunctionDefinition<ParentInformation>, recursiveCalls: RNodeWithParent[]) {
	const dfStart = input.dataflow.graph.outgoingEdges(node.info.id)
	const callsites = []
	for(const [target, edge] of dfStart ?? []) {
		if(!edgeIncludesType(edge.types, EdgeType.Calls)) {
			continue
		}
		const loc = input.normalizedRAst.idMap.get(target)?.location
		if(loc) {
			callsites.push(getRangeStart(loc))
		}
	}
	for(const call of recursiveCalls) {
		const loc = call.location
		if(loc) {
			callsites.push(getRangeStart(loc))
		}
	}
	return callsites
}

function visitDefinitions(info: FunctionDefinitionInfo, input: FeatureProcessorInput): void {
	const definitionStack: RNodeWithParent[] = []
	const allDefinitions: SingleFunctionDefinitionInformation[] = []

	visitAst(input.normalizedRAst.ast,
		node => {
			if(node.type !== RType.FunctionDefinition) {
				return
			}

			const graph = input.dataflow.graph
			const dfNode = graph.get(node.info.id, true)
			if(dfNode === undefined) {
				appendStatisticsFile(definedFunctions.name, 'no-dataflow-node-found', [node], input.filepath)
				return
			}
			const [fnDefinition] = dfNode
			guard(fnDefinition.tag === VertexType.FunctionDefinition, () => `Dataflow node is not a function definition (${JSON.stringify(fnDefinition)}))})`)

			const returnTypes = fnDefinition.exitPoints.map(ep => graph.get(ep, true)).filter(isNotUndefined)
				.map(([vertex]) => {
					const l = graph.idMap?.get(vertex.id)?.location
					return {
						location: l ? getRangeStart(l) : [-1, -1] satisfies SourcePosition
					}
				})

			if(definitionStack.length > 0) {
				info.nestedFunctions++
				info.deepestNesting = Math.max(info.deepestNesting, definitionStack.length)
				appendStatisticsFile(definedFunctions.name, 'nested-definitions', [node.info.fullLexeme ?? node.lexeme], input.filepath)
			}

			// parameter names:
			const parameterNames = node.parameters.map(p => p.info.fullLexeme ?? p.lexeme)
			appendStatisticsFile(definedFunctions.name, 'usedParameterNames', parameterNames, input.filepath)

			const isLambda = node.lexeme.startsWith('\\')
			if(isLambda) {
				info.lambdasOnly++
				appendStatisticsFile(definedFunctions.name, 'allLambdas', [node.info.fullLexeme ?? node.lexeme], input.filepath)
			}

			definitionStack.push(node)

			// we find definitions with silly defined-by edges
			const assigned = new Set<string>()
			const edges = input.dataflow.graph.ingoingEdges(node.info.id)
			if(edges !== undefined) {
				for(const [targetId, edge] of edges) {
					if(edgeIncludesType(edge.types, EdgeType.DefinedBy)) {
						const target = input.normalizedRAst.idMap.get(targetId)
						guard(target !== undefined, 'Dataflow edge points to unknown node')
						const name = target.info.fullLexeme ?? target.lexeme
						if(name) {
							assigned.add(name)
						}
						info.assignedFunctions++
						appendStatisticsFile(definedFunctions.name, 'assignedFunctions', [name ?? '<unknown>'], input.filepath)
					}
					if(edgeIncludesType(edge.types, EdgeType.Calls)) {
						const target = input.normalizedRAst.idMap.get(targetId)
						guard(target !== undefined, 'Dataflow edge points to unknown node')
					}
				}
			}

			// track all calls with the same name that do not already have a bound calls edge, superfluous if recursive tracking is explicit
			const recursiveCalls: RNodeWithParent[] = []
			visitAst(node.body, n => {
				if(n.type === RType.FunctionCall && n.named && assigned.has(n.functionName.lexeme)) {
					recursiveCalls.push(n)
				}
			})
			// one recursive definition, but we record all
			info.recursive += recursiveCalls.length > 0 ? 1 : 0
			appendStatisticsFile(definedFunctions.name, 'recursive', recursiveCalls.map(n => n.info.fullLexeme ?? n.lexeme ?? 'unknown'), input.filepath)

			const lexeme = node.info.fullLexeme
			const lexemeSplit= lexeme?.split('\n')

			allDefinitions.push({
				location:           getRangeStart(node.location),
				callsites:          retrieveAllCallsites(input, node, recursiveCalls),
				numberOfParameters: node.parameters.length,
				returns:            returnTypes,
				length:             {
					lines:                   lexemeSplit?.length ?? -1,
					characters:              lexeme?.length ?? -1,
					nonWhitespaceCharacters: lexeme?.replaceAll(/\s/g, '').length ?? 0
				}
			})
		}, node => {
			// drop again :D
			if(node.type === RType.FunctionDefinition) {
				definitionStack.pop()
			}
		}
	)

	info.total += allDefinitions.length
	appendStatisticsFile(definedFunctions.name, AllDefinitionsFileBase, allDefinitions, input.filepath)
}



export const definedFunctions: Feature<FunctionDefinitionInfo> = {
	name:        'Defined Functions',
	description: 'All functions defined within the document',

	process(existing: FunctionDefinitionInfo, input: FeatureProcessorInput): FunctionDefinitionInfo {
		visitDefinitions(existing, input)
		return existing
	},
	initialValue: initialFunctionDefinitionInfo,
	postProcess:  postProcess
}
