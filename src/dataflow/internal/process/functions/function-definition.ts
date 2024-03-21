import type { DataflowInformation } from '../../info'
import type { DataflowProcessorInformation } from '../../../processor'
import { processDataflowFor } from '../../../processor'
import type {
	IdentifierReference,
	REnvironmentInformation } from '../../../environments'
import {
	initializeCleanEnvironments,
	overwriteEnvironments,
	popLocalEnvironment,
	pushLocalEnvironment,
	resolveByName
} from '../../../environments'
import { linkInputs } from '../../linker'
import type { DataflowFunctionFlowInformation, DataflowMap } from '../../../index'
import { DataflowGraph, dataflowLogger, EdgeType } from '../../../index'
import type { NodeId, ParentInformation, RFunctionDefinition } from '../../../../r-bridge'
import { collectAllIds } from '../../../../r-bridge'
import { retrieveExitPointsOfFunctionDefinition } from './exit-points'
import { guard } from '../../../../util/assert'
import { LocalScope } from '../../../environments/scopes'


function updateNestedFunctionClosures<OtherInfo>(exitPoints: NodeId[], subgraph: DataflowGraph, outEnvironment: REnvironmentInformation, data: DataflowProcessorInformation<OtherInfo & ParentInformation>, functionDefinition: RFunctionDefinition<OtherInfo & ParentInformation>) {
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
				env.current.memory = node === undefined ? outEnvironment.current.memory : node[0].environment.current.memory
				const resolved = resolveByName(ingoing.name, data.activeScope, env)
				if(resolved === undefined) {
					remainingIn.push(ingoing)
					continue
				}
				dataflowLogger.trace(`Found ${resolved.length} references to open ref ${id} in closure of function definition ${functionDefinition.info.id}`)
				for(const ref of resolved) {
					subgraph.addEdge(ingoing, ref, EdgeType.Reads, exitPoints.length > 1 ? 'maybe' : 'always')
				}
			}
		}
		dataflowLogger.trace(`Keeping ${remainingIn.length} references to open ref ${id} in closure of function definition ${functionDefinition.info.id}`)
		info.subflow.in = [...new Set(remainingIn)]
	}
}

function prepareFunctionEnvironment<OtherInfo>(data: DataflowProcessorInformation<OtherInfo & ParentInformation>) {
	let env = initializeCleanEnvironments()
	for(let i = 0; i < data.environments.level + 1 /* add another env */; i++) {
		env = pushLocalEnvironment(env)
	}
	return { ...data, environments: env }
}

/**
 * Within something like `f <- function(a=b, m=3) { b <- 1; a; b <- 5; a + 1 }`
 * `a` will be defined by `b` and `b`will be a promise object bound by the first definition of b it can find.
 * This means, that this function returns `2` due to the first `b <- 1` definition.
 * If the code would be `f <- function(a=b, m=3) { if(m > 3) { b <- 1; }; a; b <- 5; a + 1 }`, we need a link to `b <- 1` and `b <- 6`
 * as `b` can be defined by either one of them.
 * <p>
 * <b>Currently we may be unable to narrow down every definition within the body as we have not implemented ways to track what covers a first definitions</b>
 */
function findPromiseLinkagesForParameters(parameters: DataflowGraph, readInParameters: IdentifierReference[], parameterEnvs: REnvironmentInformation, body: DataflowInformation): IdentifierReference[] {
	// first we try to bind again within parameters - if we have it, fine
	const remainingRead: IdentifierReference[] = []
	for(const read of readInParameters) {
		const resolved = resolveByName(read.name, LocalScope, parameterEnvs)
		if(resolved !== undefined) {
			for(const ref of resolved) {
				parameters.addEdge(read, ref, EdgeType.Reads, 'always')
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
		if(writingOuts[0].used === 'always') {
			parameters.addEdge(read, writingOuts[0], EdgeType.Reads, 'always')
			continue
		}
		for(const out of writingOuts) {
			parameters.addEdge(read, out, EdgeType.Reads, 'maybe')
		}
	}
	return remainingRead
}

export function processFunctionDefinition<OtherInfo>(functionDefinition: RFunctionDefinition<OtherInfo & ParentInformation>, data: DataflowProcessorInformation<OtherInfo & ParentInformation>): DataflowInformation {
	dataflowLogger.trace(`Processing function definition with id ${functionDefinition.info.id}`)

	const originalEnvironments = data.environments
	// within a function def we do not pass on the outer binds as they could be overwritten when called
	data = prepareFunctionEnvironment(data)

	const subgraph = new DataflowGraph()

	let readInParameters: IdentifierReference[] = []
	for(const param of functionDefinition.parameters) {
		const processed = processDataflowFor(param, data)
		subgraph.mergeWith(processed.graph)
		const read = [...processed.in, ...processed.unknownReferences]
		linkInputs(read, data.activeScope, data.environments, readInParameters, subgraph, false)
		data = { ...data, environments: overwriteEnvironments(data.environments, processed.environments) }
	}
	const paramsEnvironments = data.environments

	const body = processDataflowFor(functionDefinition.body, data)
	// as we know, that parameters can not duplicate, we overwrite their environments (which is the correct behavior, if someone uses non-`=` arguments in functions)
	const bodyEnvironment = body.environments


	readInParameters = findPromiseLinkagesForParameters(subgraph, readInParameters, paramsEnvironments, body)

	const readInBody = [...body.in, ...body.unknownReferences]
	// there is no uncertainty regarding the arguments, as if a function header is executed, so is its body
	const remainingRead = linkInputs(readInBody, data.activeScope, paramsEnvironments, readInParameters.slice(), body.graph, true /* functions do not have to be called */)

	subgraph.mergeWith(body.graph)

	dataflowLogger.trace(`Function definition with id ${functionDefinition.info.id} has ${remainingRead.length} remaining reads`)

	// link same-def-def with arguments
	for(const writeTarget of body.out) {
		const writeName = writeTarget.name

		const resolved = resolveByName(writeName, data.activeScope, paramsEnvironments)
		if(resolved !== undefined) {
			// write-write
			for(const target of resolved) {
				subgraph.addEdge(target, writeTarget, EdgeType.SameDefDef, undefined, true)
			}
		}
	}

	const outEnvironment = overwriteEnvironments(paramsEnvironments, bodyEnvironment)
	for(const read of remainingRead) {
		subgraph.addVertex({ tag: 'use', id: read.nodeId, name: read.name, environment: outEnvironment, when: 'maybe' })
	}


	const flow: DataflowFunctionFlowInformation = {
		unknownReferences: [],
		in:                remainingRead,
		out:               [],
		graph:             new Set(subgraph.rootIds()),
		environments:      outEnvironment,
		scope:             data.activeScope
	}

	const exitPoints = retrieveExitPointsOfFunctionDefinition(functionDefinition)
	// if exit points are extra, we must link them to all dataflow nodes they relate to.
	linkExitPointsInGraph(exitPoints, subgraph, data.completeAst.idMap, outEnvironment)
	updateNestedFunctionClosures(exitPoints, subgraph, outEnvironment, data, functionDefinition)

	const graph = new DataflowGraph().mergeWith(subgraph, false)
	graph.addVertex({
		tag:         'function-definition',
		id:          functionDefinition.info.id,
		name:        functionDefinition.info.id,
		environment: popLocalEnvironment(outEnvironment),
		scope:       data.activeScope,
		when:        'always',
		subflow:     flow,
		exitPoints
	})
	return {
		unknownReferences: [] /* nothing escapes a function definition, but the function itself, will be forced in assignment: { nodeId: functionDefinition.info.id, scope: data.activeScope, used: 'always', name: functionDefinition.info.id as string } */,
		in:                [],
		out:               [],
		graph,
		environments:      originalEnvironments,
		scope:             data.activeScope
	}
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
		graph.addVertex({ tag: 'exit-point', id: exitPoint, name: `${nodeInAst.lexeme ?? '??'}`, when: 'always', environment })

		const allIds = [...collectAllIds(nodeInAst)].filter(id => graph.get(id, true) !== undefined)
		for(const relatedId of allIds) {
			if(relatedId !== exitPoint) {
				graph.addEdge(exitPoint, relatedId, EdgeType.Relates, 'always')
			}
		}
	}
}

