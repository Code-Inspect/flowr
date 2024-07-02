import type { DataflowProcessorInformation } from '../../../../../processor'
import { processDataflowFor } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import { ExitPointType } from '../../../../../info'
import { linkInputs } from '../../../../linker'
import { processKnownFunctionCall } from '../known-call-handling'
import { unpackArgument } from '../argument/unpack-argument'
import { guard } from '../../../../../../util/assert'
import { dataflowLogger } from '../../../../../logger'
import type { ParentInformation } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RSymbol } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import type { RFunctionArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import { EmptyArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { NodeId } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/node-id'
import type { DataflowFunctionFlowInformation } from '../../../../../graph/graph'
import { DataflowGraph } from '../../../../../graph/graph'
import type { IdentifierReference } from '../../../../../environments/identifier'
import { overwriteEnvironment } from '../../../../../environments/overwrite'
import { VertexType } from '../../../../../graph/vertex'
import { popLocalEnvironment, pushLocalEnvironment } from '../../../../../environments/scoping'
import type { REnvironmentInformation } from '../../../../../environments/environment'
import { initializeCleanEnvironments } from '../../../../../environments/environment'
import { resolveByName } from '../../../../../environments/resolve-by-name'
import { EdgeType } from '../../../../../graph/edge'
import { expensiveTrace } from '../../../../../../util/log'

export function processFunctionDefinition<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>
): DataflowInformation {
	if(args.length < 1) {
		dataflowLogger.warn(`Function Definition ${name.content} does not have an argument, skipping`)
		return processKnownFunctionCall({ name, args, rootId, data }).information
	}

	/* we remove the last argument, as it is the body */
	const parameters = args.slice(0, -1)
	const bodyArg = unpackArgument(args[args.length - 1])
	guard(bodyArg !== undefined, () => `Function Definition ${JSON.stringify(args)} has missing body! Bad!`)

	const originalEnvironment = data.environment
	// within a function def we do not pass on the outer binds as they could be overwritten when called
	data = prepareFunctionEnvironment(data)

	const subgraph = new DataflowGraph(data.completeAst.idMap)

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
	// As we know, parameters cannot technically duplicate (i.e., their names are unique), we overwrite their environments.
	// This is the correct behavior, even if someone uses non-`=` arguments in functions.
	const bodyEnvironment = body.environment

	readInParameters = findPromiseLinkagesForParameters(subgraph, readInParameters, paramsEnvironments, body)

	const readInBody = [...body.in, ...body.unknownReferences]
	// there is no uncertainty regarding the arguments, as if a function header is executed, so is its body
	const remainingRead = linkInputs(readInBody, paramsEnvironments, readInParameters.slice(), body.graph, true /* functions do not have to be called */)

	subgraph.mergeWith(body.graph)

	dataflowLogger.trace(`Function definition with id ${name.info.id} has ${remainingRead.length} remaining reads`)

	const outEnvironment = overwriteEnvironment(paramsEnvironments, bodyEnvironment)

	for(const read of remainingRead) {
		if(read.name) {
			subgraph.addVertex({
				tag:                 VertexType.Use,
				id:                  read.nodeId,
				environment:         undefined,
				controlDependencies: undefined
			})
		}
	}

	const flow: DataflowFunctionFlowInformation = {
		unknownReferences: [],
		in:                remainingRead,
		out:               [],
		entryPoint:        body.entryPoint,
		graph:             new Set(subgraph.rootIds()),
		environment:       outEnvironment
	}

	updateNestedFunctionClosures(subgraph, outEnvironment, name)
	const exitPoints = body.exitPoints

	const graph = new DataflowGraph(data.completeAst.idMap).mergeWith(subgraph, false)
	graph.addVertex({
		tag:                 VertexType.FunctionDefinition,
		id:                  name.info.id,
		environment:         popLocalEnvironment(outEnvironment),
		controlDependencies: data.controlDependencies,
		subflow:             flow,
		exitPoints:          exitPoints?.filter(e => e.type === ExitPointType.Return || e.type === ExitPointType.Default).map(e => e.nodeId)	?? []
	})
	return {
		/* nothing escapes a function definition, but the function itself, will be forced in assignment: { nodeId: functionDefinition.info.id, scope: data.activeScope, used: 'always', name: functionDefinition.info.id as string } */
		unknownReferences: [],
		in:                [],
		out:               [],
		exitPoints:        [],
		entryPoint:        name.info.id,
		graph,
		environment:       originalEnvironment
	}
}



function updateNestedFunctionClosures<OtherInfo>(
	subgraph: DataflowGraph,
	outEnvironment: REnvironmentInformation,
	name: RSymbol<OtherInfo & ParentInformation>
) {
	// track *all* function definitions - including those nested within the current graph,
	// try to resolve their 'in' by only using the lowest scope which will be popped after this definition
	for(const [id, { subflow, tag }] of subgraph.vertices(true)) {
		if(tag !== VertexType.FunctionDefinition) {
			continue
		}

		const ingoingRefs = subflow.in
		const remainingIn: IdentifierReference[] = []
		for(const ingoing of ingoingRefs) {
			const resolved = ingoing.name ? resolveByName(ingoing.name, outEnvironment) : undefined
			if(resolved === undefined) {
				remainingIn.push(ingoing)
				continue
			}
			expensiveTrace(dataflowLogger, () => `Found ${resolved.length} references to open ref ${id} in closure of function definition ${name.info.id}`)
			for(const ref of resolved) {
				subgraph.addEdge(ingoing, ref, { type: EdgeType.Reads })
			}
		}
		expensiveTrace(dataflowLogger, () => `Keeping ${remainingIn.length} references to open ref ${id} in closure of function definition ${name.info.id}`)
		subflow.in = remainingIn
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
 * This means that this function returns `2` due to the first `b <- 1` definition.
 * If the code is `f <- function(a=b, m=3) { if(m > 3) { b <- 1; }; a; b <- 5; a + 1 }`, we need a link to `b <- 1` and `b <- 6`
 * as `b` can be defined by either one of them.
 * <p>
 * <b>Currently we may be unable to narrow down every definition within the body as we have not implemented ways to track what covers the first definitions precisely</b>
 */
function findPromiseLinkagesForParameters(parameters: DataflowGraph, readInParameters: readonly IdentifierReference[], parameterEnvs: REnvironmentInformation, body: DataflowInformation): IdentifierReference[] {
	// first, we try to bind again within parameters - if we have it, fine
	const remainingRead: IdentifierReference[] = []
	for(const read of readInParameters) {
		const resolved = read.name ? resolveByName(read.name, parameterEnvs) : undefined
		if(resolved !== undefined) {
			for(const ref of resolved) {
				parameters.addEdge(read, ref, { type: EdgeType.Reads })
			}
			continue
		}
		// If not resolved, link all outs within the body as potential reads.
		// Regarding the sort, we can ignore equality as nodeIds are unique.
		// We sort to get the lowest id - if it is an 'always' flag, we can safely use it instead of all of them.
		const writingOuts = body.out.filter(o => o.name === read.name).sort((a, b) => String(a.nodeId) < String(b.nodeId) ? 1 : -1)
		if(writingOuts.length === 0) {
			remainingRead.push(read)
			continue
		}
		if(writingOuts[0].controlDependencies === undefined) {
			parameters.addEdge(read, writingOuts[0], { type: EdgeType.Reads })
			continue
		}
		for(const out of writingOuts) {
			parameters.addEdge(read, out, { type: EdgeType.Reads })
		}
	}
	return remainingRead
}
