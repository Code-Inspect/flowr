import type {
	DataflowGraph,
	DataflowGraphVertexFunctionCall,
	DataflowGraphVertexInfo,
	FunctionArgument,
	NamedFunctionArgument,
	PositionalFunctionArgument
} from '../graph'
import {
	CONSTANT_NAME
} from '../graph'
import type {
	IdentifierReference,
	REnvironmentInformation
} from '../environments'
import {
	BuiltIn,
	resolveByName
} from '../environments'
import { DefaultMap } from '../../util/defaultmap'
import { guard } from '../../util/assert'
import { expensiveTrace, log } from '../../util/log'
import type { DecoratedAstMap, NodeId, ParentInformation, RParameter } from '../../r-bridge'
import { RType } from '../../r-bridge'
import { slicerLogger } from '../../slicing'
import { dataflowLogger, EdgeType } from '../index'

export function linkIngoingVariablesInSameScope(graph: DataflowGraph, references: IdentifierReference[]): void {
	const nameIdShares = produceNameSharedIdMap(references)
	linkReadVariablesInSameScopeWithNames(graph, nameIdShares)
}

export type NameIdMap = DefaultMap<string, IdentifierReference[]>

export function produceNameSharedIdMap(references: IdentifierReference[]): NameIdMap {
	const nameIdShares = new DefaultMap<string, IdentifierReference[]>(() => [])
	for(const reference of references) {
		if(reference.name) {
			nameIdShares.get(reference.name).push(reference)
		}
	}
	return nameIdShares
}

export function linkReadVariablesInSameScopeWithNames(graph: DataflowGraph, nameIdShares: DefaultMap<string, IdentifierReference[]>) {
	for(const [name, ids] of nameIdShares.entries()) {
		if(ids.length <= 1 || name === CONSTANT_NAME) {
			continue
		}
		const base = ids[0]
		for(let i = 1; i < ids.length; i++) {
			graph.addEdge(base.nodeId, ids[i].nodeId, { type: EdgeType.SameReadRead })
		}
	}
}

export function linkArgumentsOnCall(args: FunctionArgument[], params: RParameter<ParentInformation>[], graph: DataflowGraph): void {
	const nameArgMap = new Map<string, IdentifierReference | '<value>'>(args.filter(Array.isArray) as NamedFunctionArgument[])
	const nameParamMap = new Map<string, RParameter<ParentInformation>>(params.map(p => [p.name.content, p]))

	const specialDotParameter = params.find(p => p.special)

	// all parameters matched by name
	const matchedParameters = new Set<string>()


	// first map names
	for(const [name, arg] of nameArgMap) {
		if(arg === '<value>') {
			dataflowLogger.trace(`skipping value argument for ${name}`)
			continue
		}
		const param = nameParamMap.get(name)
		if(param !== undefined) {
			dataflowLogger.trace(`mapping named argument "${name}" to parameter "${param.name.content}"`)
			graph.addEdge(arg.nodeId, param.name.info.id, { type: EdgeType.DefinesOnCall })
			matchedParameters.add(name)
		} else if(specialDotParameter !== undefined) {
			dataflowLogger.trace(`mapping named argument "${name}" to dot-dot-dot parameter`)
			graph.addEdge(arg.nodeId, specialDotParameter.name.info.id, { type: EdgeType.DefinesOnCall })
		}
	}

	const remainingParameter = params.filter(p => !matchedParameters.has(p.name.content))
	const remainingArguments = args.filter(a => !Array.isArray(a)) as (PositionalFunctionArgument | 'empty')[]

	for(let i = 0; i < remainingArguments.length; i++) {
		const arg: PositionalFunctionArgument | 'empty' = remainingArguments[i]
		if(arg === '<value>' || arg === 'empty') {
			dataflowLogger.trace(`skipping value argument for ${i}`)
			continue
		}
		if(remainingParameter.length <= i) {
			if(specialDotParameter !== undefined) {
				dataflowLogger.trace(`mapping unnamed argument ${i} (id: ${arg.nodeId}) to dot-dot-dot parameter`)
				graph.addEdge(arg.nodeId, specialDotParameter.name.info.id, { type: EdgeType.DefinesOnCall })
			} else {
				dataflowLogger.error(`skipping argument ${i} as there is no corresponding parameter - R should block that`)
			}
			continue
		}
		const param = remainingParameter[i]
		dataflowLogger.trace(`mapping unnamed argument ${i} (id: ${arg.nodeId}) to parameter "${param.name.content}"`)
		graph.addEdge(arg.nodeId, param.name.info.id, { type: EdgeType.DefinesOnCall })
	}
}


function linkFunctionCallArguments(targetId: NodeId, idMap: DecoratedAstMap, functionCallName: string, functionRootId: NodeId, callArgs: FunctionArgument[], finalGraph: DataflowGraph): void {
	// we get them by just choosing the rhs of the definition
	const linkedFunction = idMap.get(targetId)
	if(linkedFunction === undefined) {
		dataflowLogger.trace(`no function definition found for ${functionCallName} (${functionRootId})`)
		return
	}

	if(linkedFunction.type !== RType.FunctionDefinition) {
		dataflowLogger.trace(`function call definition base ${functionCallName} does not lead to a function definition (${functionRootId}) but got ${linkedFunction.type}`)
		return
	}
	expensiveTrace(dataflowLogger, () => `linking arguments for ${functionCallName} (${functionRootId}) to ${JSON.stringify(linkedFunction.location)}`)
	linkArgumentsOnCall(callArgs, linkedFunction.parameters, finalGraph)
}


function linkFunctionCall(graph: DataflowGraph, id: NodeId, info: DataflowGraphVertexFunctionCall, idMap: DecoratedAstMap, thisGraph: DataflowGraph, calledFunctionDefinitions: {
	functionCall: NodeId;
	called:       DataflowGraphVertexInfo[]
}[]) {
	const edges = graph.get(id, true)
	guard(edges !== undefined, () => `id ${id} must be present in graph`)

	const functionDefinitionReadIds = [...edges[1]].filter(([_, e]) => e.types.has(EdgeType.Reads) || e.types.has(EdgeType.Calls) || e.types.has(EdgeType.Relates)).map(([target, _]) => target)

	const functionDefs = getAllLinkedFunctionDefinitions(new Set(functionDefinitionReadIds), graph)

	for(const def of functionDefs.values()) {
		guard(def.tag === 'function-definition', () => `expected function definition, but got ${def.tag}`)

		if(info.environment !== undefined) {
			// for each open ingoing reference, try to resolve it here, and if so add a read edge from the call to signal that it reads it
			for(const ingoing of def.subflow.in) {
				const defs = ingoing.name ? resolveByName(ingoing.name, info.environment) : undefined
				if(defs === undefined) {
					continue
				}
				for(const def of defs) {
					graph.addEdge(id, def, { type: EdgeType.Reads })
				}
			}
		}

		const exitPoints = def.exitPoints
		for(const exitPoint of exitPoints) {
			graph.addEdge(id, exitPoint, { type: EdgeType.Returns })
		}
		dataflowLogger.trace(`recording expression-list-level call from ${info.name} to ${def.name}`)
		graph.addEdge(id, def.id, { type: EdgeType.Calls })
		linkFunctionCallArguments(def.id, idMap, def.name, id, info.args, graph)
	}
	if(thisGraph.isRoot(id)) {
		calledFunctionDefinitions.push({ functionCall: id, called: [...functionDefs.values()] })
	}
}

/**
 * Returns the called functions within the current graph, which can be used to merge the environments with the call.
 * Furthermore, it links the corresponding arguments.
 */
export function linkFunctionCalls(
	graph: DataflowGraph,
	idMap: DecoratedAstMap,
	functionCalls: readonly [NodeId, DataflowGraphVertexInfo][],
	thisGraph: DataflowGraph
): { functionCall: NodeId, called: readonly DataflowGraphVertexInfo[] }[] {
	const calledFunctionDefinitions: { functionCall: NodeId, called: DataflowGraphVertexInfo[] }[] = []
	for(const [id, info] of functionCalls) {
		guard(info.tag === 'function-call', () => `encountered non-function call in function call linkage ${JSON.stringify(info)}`)
		linkFunctionCall(graph, id, info, idMap, thisGraph, calledFunctionDefinitions)
	}
	return calledFunctionDefinitions
}


export function getAllLinkedFunctionDefinitions(functionDefinitionReadIds: Set<NodeId>, dataflowGraph: DataflowGraph): Map<NodeId, DataflowGraphVertexInfo> {
	const potential: NodeId[] = [...functionDefinitionReadIds]
	const visited = new Set<NodeId>()
	const result = new Map<NodeId, DataflowGraphVertexInfo>()
	while(potential.length > 0) {
		const currentId = potential.pop() as NodeId

		if(currentId === BuiltIn) {
			// do not traverse builtins
			slicerLogger.trace('skipping builtin function definition during collection')
			continue
		}
		const currentInfo = dataflowGraph.get(currentId, true)
		if(currentInfo === undefined) {
			slicerLogger.trace('skipping unknown link')
			continue
		}
		visited.add(currentId)

		const outgoingEdges = [...currentInfo[1]]

		const returnEdges = outgoingEdges.filter(([_, e]) => e.types.has(EdgeType.Returns))
		if(returnEdges.length > 0) {
			// only traverse return edges and do not follow calls etc. as this indicates that we have a function call which returns a result, and not the function call itself
			potential.push(...returnEdges.map(([target]) => target).filter(id => !visited.has(id)))
			continue
		}
		const followEdges = outgoingEdges.filter(([_, e]) => e.types.has(EdgeType.Reads) || e.types.has(EdgeType.DefinedBy) || e.types.has(EdgeType.DefinedByOnCall) || e.types.has(EdgeType.Relates))


		if(currentInfo[0].subflow !== undefined) {
			result.set(currentId, currentInfo[0])
		}

		// trace all joined reads
		potential.push(...followEdges.map(([target]) => target).filter(id => !visited.has(id)))
	}
	return result
}

/**
 * This method links a set of read variables to definitions in an environment.
 *
 * @param referencesToLinkAgainstEnvironment - The set of references to link against the environment
 * @param environmentInformation             - The environment information to link against
 * @param givenInputs                        - The existing list of inputs that might be extended
 * @param graph                              - The graph to enter the found links
 * @param maybeForRemaining                  - Each input that can not be linked, will be added to `givenInputs`. If this flag is `true`, it will be marked as `maybe`.
 *
 * @returns the given inputs, possibly extended with the remaining inputs (those of `referencesToLinkAgainstEnvironment` that could not be linked against the environment)
 */
export function linkInputs(referencesToLinkAgainstEnvironment: readonly IdentifierReference[], environmentInformation: REnvironmentInformation, givenInputs: IdentifierReference[], graph: DataflowGraph, maybeForRemaining: boolean): IdentifierReference[] {
	for(const bodyInput of referencesToLinkAgainstEnvironment) {
		const probableTarget = bodyInput.name ? resolveByName(bodyInput.name, environmentInformation) : undefined
		if(probableTarget === undefined) {
			log.trace(`found no target for ${bodyInput.name}`)
			if(maybeForRemaining) {
				bodyInput.controlDependency ??= []
			}
			givenInputs.push(bodyInput)
		} else {
			for(const target of probableTarget) {
				// we can stick with maybe even if readId.attribute is always
				graph.addEdge(bodyInput, target, { type: EdgeType.Reads })
			}
		}
	}
	// data.graph.get(node.id).definedAtPosition = false
	return givenInputs
}

/** all loops variables which are open read (not already bound by a redefinition within the loop) get a maybe read marker to their last definition within the loop
 * e.g. with:
 * ```R
 * for(i in 1:10) {
 *  x_1 <- x_2 + 1
 * }
 * ```
 * `x_2` must get a read marker to `x_1` as `x_1` is the active redefinition in the second loop iteration.
 */
export function linkCircularRedefinitionsWithinALoop(graph: DataflowGraph, openIns: NameIdMap, outgoing: readonly IdentifierReference[]): void {
	// first we preprocess out so that only the last definition of a given identifier survives
	// this implicitly assumes that the outgoing references are ordered
	const lastOutgoing = new Map<string, IdentifierReference>()
	for(const out of outgoing) {
		if(out.name) {
			lastOutgoing.set(out.name, out)
		}
	}
	for(const [name, targets] of openIns.entries()) {
		for(const out of lastOutgoing.values()) {
			if(out.name === name) {
				for(const target of targets) {
					graph.addEdge(target.nodeId, out.nodeId, { type: EdgeType.Reads })
				}
			}
		}
	}
}
