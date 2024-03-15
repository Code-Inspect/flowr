import type {
	NodeId,
	ParentInformation,
	RFunctionArgument,
	RSymbol
} from '../../../../../../r-bridge'
import {
	EmptyArgument,
	collectAllIds
} from '../../../../../../r-bridge'
import type { DataflowProcessorInformation } from '../../../../../processor'
import { processDataflowFor } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import {
	linkInputs
} from '../../../../linker'
import {
	type DataflowFunctionFlowInformation,
	DataflowGraph,
	dataflowLogger, type DataflowMap, EdgeType,
	type IdentifierReference, initializeCleanEnvironments,
	type REnvironmentInformation
} from '../../../../../index'
import { processKnownFunctionCall } from '../known-call-handling'
import { unpackArgument } from '../argument/unpack-argument'
import { guard } from '../../../../../../util/assert'
import {
	overwriteEnvironment,
	popLocalEnvironment,
	pushLocalEnvironment,
	resolveByName
} from '../../../../../environments'
import { retrieveExitPointsOfFunctionDefinition } from '../../exit-points'

// TODO: we have to map the named alist correctly
export function processFunctionDefinition<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>
): DataflowInformation {
	if(args.length < 1) {
		dataflowLogger.warn(`Function Definition ${name.content} does not have an argument, skipping`)
		return processKnownFunctionCall(name, args, rootId, data).information
	}

	const parameters = args.slice(0, -1)

	const bodyArg = unpackArgument(args[args.length - 1])
	guard(bodyArg !== undefined, () => `Function Definition ${JSON.stringify(args)} has missing body! Bad!`)

	const originalEnvironment = data.environment
	// within a function def we do not pass on the outer binds as they could be overwritten when called
	data = prepareFunctionEnvironment(data)

	const subgraph = new DataflowGraph()

	let readInParameters: IdentifierReference[] = []
	for(const param of parameters) {
		guard(param !== EmptyArgument, () => `Empty argument in function definition ${name.content}, ${JSON.stringify(args)}`)
		const processed = processDataflowFor(param, data)
		subgraph.mergeWith(processed.graph)
		const read = [...processed.in, ...processed.unknownReferences]
		linkInputs(read, data.environment, readInParameters, subgraph, false)
		data = { ...data, environment: overwriteEnvironment(data.environment, processed.environment) }
	}
	const paramsEnvironments = data.environment

	const body = processDataflowFor(bodyArg, data)
	// as we know, that parameters can not duplicate, we overwrite their environments (which is the correct behavior, if someone uses non-`=` arguments in functions)
	const bodyEnvironment = body.environment


	readInParameters = findPromiseLinkagesForParameters(subgraph, readInParameters, paramsEnvironments, body)

	const readInBody = [...body.in, ...body.unknownReferences]
	// there is no uncertainty regarding the arguments, as if a function header is executed, so is its body
	const remainingRead = linkInputs(readInBody, paramsEnvironments, readInParameters.slice(), body.graph, true /* functions do not have to be called */)

	subgraph.mergeWith(body.graph)

	dataflowLogger.trace(`Function definition with id ${name.info.id} has ${remainingRead.length} remaining reads`)

	// link same-def-def with arguments
	for(const writeTarget of body.out) {
		const writeName = writeTarget.name

		const resolved = writeName ? resolveByName(writeName, paramsEnvironments) : undefined
		if(resolved !== undefined) {
			// write-write
			for(const target of resolved) {
				subgraph.addEdge(target, writeTarget, { type: EdgeType.SameDefDef })
			}
		}
	}

	const outEnvironment = overwriteEnvironment(paramsEnvironments, bodyEnvironment)

	for(const read of remainingRead) {
		if(read.name) {
			subgraph.addVertex({
				tag:               'use',
				id:                read.nodeId,
				name:              read.name,
				environment:       undefined,
				controlDependency: []
			})
		}
	}

	// TODO: use returns to find exit points

	const flow: DataflowFunctionFlowInformation = {
		unknownReferences: [],
		in:                remainingRead,
		out:               [],
		breaks:            [],
		returns:           [],
		nexts:             [],
		entryPoint:        body.entryPoint,
		graph:             new Set(subgraph.rootIds()),
		environment:       outEnvironment
	}

	const exitPoints = retrieveExitPointsOfFunctionDefinition(bodyArg)
	// if exit points are extra, we must link them to all dataflow nodes they relate to.
	linkExitPointsInGraph(exitPoints, subgraph, data.completeAst.idMap, outEnvironment)
	updateNestedFunctionClosures(exitPoints, subgraph, outEnvironment, name)

	const graph = new DataflowGraph().mergeWith(subgraph, false)
	graph.addVertex({
		tag:               'function-definition',
		id:                name.info.id,
		name:              name.info.id,
		environment:       popLocalEnvironment(outEnvironment),
		controlDependency: data.controlDependency,
		subflow:           flow,
		exitPoints
	})
	return {
		unknownReferences: [] /* nothing escapes a function definition, but the function itself, will be forced in assignment: { nodeId: functionDefinition.info.id, scope: data.activeScope, used: 'always', name: functionDefinition.info.id as string } */,
		in:                [],
		out:               [],
		returns:           [],
		breaks:            [],
		nexts:             [],
		entryPoint:        name.info.id,
		graph,
		environment:       originalEnvironment
	}
}



function updateNestedFunctionClosures<OtherInfo>(exitPoints: NodeId[], subgraph: DataflowGraph, outEnvironment: REnvironmentInformation, name: RSymbol<OtherInfo & ParentInformation>) {
	// track *all* function definitions - included those nested within the current graph
	// try to resolve their 'in' by only using the lowest scope which will be popped after this definition
	for(const [id, info] of subgraph.vertices(true)) {
		if(info.tag !== 'function-definition') {
			continue
		}
		const ingoingRefs = info.subflow.in
		const remainingIn: IdentifierReference[] = []
		for(const ingoing of ingoingRefs) {
			for(const exitPoint of exitPoints) {
				const node = subgraph.get(exitPoint, true)
				const env = initializeCleanEnvironments()
				env.current.memory = node === undefined ? outEnvironment.current.memory : node[0].environment?.current.memory ?? outEnvironment.current.memory
				const resolved = ingoing.name ? resolveByName(ingoing.name, env) : undefined
				if(resolved === undefined) {
					remainingIn.push(ingoing)
					continue
				}
				dataflowLogger.trace(`Found ${resolved.length} references to open ref ${id} in closure of function definition ${name.info.id}`)
				for(const ref of resolved) {
					subgraph.addEdge(ingoing, ref, { type: EdgeType.Reads })
				}
			}
		}
		dataflowLogger.trace(`Keeping ${remainingIn.length} references to open ref ${id} in closure of function definition ${name.info.id}`)
		info.subflow.in = [...new Set(remainingIn)]
	}
}

function prepareFunctionEnvironment<OtherInfo>(data: DataflowProcessorInformation<OtherInfo & ParentInformation>) {
	let env = initializeCleanEnvironments()
	for(let i = 0; i < data.environment.level + 1 /* add another env */; i++) {
		env = pushLocalEnvironment(env)
	}
	return { ...data, environment: env }
}

/**
 * Within something like `f <- function(a=b, m=3) { b <- 1; a; b <- 5; a + 1 }`
 * `a` will be defined by `b` and `b`will be a promise object bound by the first definition of b it can find.
 * This means, that this function returns `2` due to the first `b <- 1` definition.
 * If the code is `f <- function(a=b, m=3) { if(m > 3) { b <- 1; }; a; b <- 5; a + 1 }`, we need a link to `b <- 1` and `b <- 6`
 * as `b` can be defined by either one of them.
 * <p>
 * <b>Currently we may be unable to narrow down every definition within the body as we have not implemented ways to track what covers a first definitions</b>
 */
function findPromiseLinkagesForParameters(parameters: DataflowGraph, readInParameters: readonly IdentifierReference[], parameterEnvs: REnvironmentInformation, body: DataflowInformation): IdentifierReference[] {
	// first we try to bind again within parameters - if we have it, fine
	const remainingRead: IdentifierReference[] = []
	for(const read of readInParameters) {
		const resolved = read.name ? resolveByName(read.name, parameterEnvs) : undefined
		if(resolved !== undefined) {
			for(const ref of resolved) {
				parameters.addEdge(read, ref, { type: EdgeType.Reads })
			}
			continue
		}
		// if not resolved, link all outs within the body as potential reads
		// regarding the sort we can ignore equality as nodeIds are unique
		// we sort to get the lowest id - if it is an 'always' flag we can safely use it instead of all of them
		const writingOuts = body.out.filter(o => o.name === read.name).sort((a, b) => a.nodeId < b.nodeId ? 1 : -1)
		if(writingOuts.length === 0) {
			remainingRead.push(read)
			continue
		}
		if(writingOuts[0].controlDependency === undefined) {
			parameters.addEdge(read, writingOuts[0], { type: EdgeType.Reads })
			continue
		}
		for(const out of writingOuts) {
			parameters.addEdge(read, out, { type: EdgeType.Reads })
		}
	}
	return remainingRead
}


function linkExitPointsInGraph<OtherInfo>(exitPoints: string[], graph: DataflowGraph, idMap: DataflowMap<OtherInfo>, environment: REnvironmentInformation): void {
	for(const exitPoint of exitPoints) {
		const exitPointNode = graph.get(exitPoint, true)
		// if there already is an exit point it is either a variable or already linked
		if(exitPointNode !== undefined) {
			continue
		}
		const nodeInAst = idMap.get(exitPoint)

		guard(nodeInAst !== undefined, `Could not find exit point node with id ${exitPoint} in ast`)
		graph.addVertex({ tag: 'exit-point', id: exitPoint, name: `${nodeInAst.lexeme ?? '??'}`, environment, controlDependency: undefined })

		const allIds = [...collectAllIds(nodeInAst)].filter(id => graph.get(id, true) !== undefined)
		for(const relatedId of allIds) {
			if(relatedId !== exitPoint) {
				graph.addEdge(exitPoint, relatedId, { type: EdgeType.Relates })
			}
		}
	}
}

