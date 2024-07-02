import type { DataflowProcessorInformation } from '../../../../../processor'
import type { DataflowInformation } from '../../../../../info'
import { processKnownFunctionCall } from '../known-call-handling'
import { guard } from '../../../../../../util/assert'
import { log, LogLevel } from '../../../../../../util/log'
import { unpackArgument } from '../argument/unpack-argument'
import { processAsNamedCall } from '../../../process-named-call'
import { toUnnamedArgument } from '../argument/make-argument'
import type { ParentInformation, RNodeWithParent } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { Base, Location, RNode } from '../../../../../../r-bridge/lang-4.x/ast/model/model'
import type { RSymbol } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-symbol'
import { RType } from '../../../../../../r-bridge/lang-4.x/ast/model/type'
import type { RFunctionArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { NodeId } from '../../../../../../r-bridge/lang-4.x/ast/model/processing/node-id'
import { dataflowLogger } from '../../../../../logger'
import type { IdentifierDefinition, IdentifierReference } from '../../../../../environments/identifier'
import { overwriteEnvironment } from '../../../../../environments/overwrite'
import type { RString } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-string'
import { removeRQuotes } from '../../../../../../r-bridge/retriever'
import type { RUnnamedArgument } from '../../../../../../r-bridge/lang-4.x/ast/model/nodes/r-argument'
import { VertexType } from '../../../../../graph/vertex'
import { define } from '../../../../../environments/define'
import { EdgeType } from '../../../../../graph/edge'

function toReplacementSymbol<OtherInfo>(target: RNodeWithParent<OtherInfo & ParentInformation> & Base<OtherInfo> & Location, prefix: string, superAssignment: boolean): RSymbol<OtherInfo & ParentInformation> {
	return {
		type:      RType.Symbol,
		info:      target.info,
		/* they are all mapped to <- in R, but we mark super as well */
		content:   `${prefix}${superAssignment ? '<<-' : '<-'}`,
		lexeme:    target.lexeme,
		location:  target.location,
		namespace: undefined
	}
}

function getEffectiveOrder<T>(config: {
	swapSourceAndTarget?: boolean
}, args: [T, T]): [T, T] {
	return config.swapSourceAndTarget ? [args[1], args[0]] : args
}

export interface AssignmentConfiguration {
	readonly superAssignment?:     boolean
	readonly swapSourceAndTarget?: boolean
	/* Make maybe if assigned to symbol */
	readonly makeMaybe?:           boolean
	readonly quoteSource?:         boolean
	readonly canBeReplacement?:    boolean
}

/**
 * Processes an assignment, i.e., `<target> <- <source>`.
 * Handling it as a function call \`&lt;-\` `(<target>, <source>)`.
 * This includes handling of replacement functions (e.g., `names(x) <- ...` as \`names&lt;-\` `(x, ...)`).
 */
export function processAssignment<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	/* we expect them to be ordered in the sense that we have (source, target): `<source> <- <target>` */
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>,
	config: AssignmentConfiguration
): DataflowInformation {
	if(args.length != 2) {
		dataflowLogger.warn(`Assignment ${name.content} has something else than 2 arguments, skipping`)
		return processKnownFunctionCall({ name, args, rootId, data }).information
	}

	const effectiveArgs = getEffectiveOrder(config, args as [RFunctionArgument<OtherInfo & ParentInformation>, RFunctionArgument<OtherInfo & ParentInformation>])
	const { target, source } = extractSourceAndTarget(effectiveArgs, name)
	const { type, named } = target

	if(type === RType.Symbol) {
		const res = processKnownFunctionCall({ name, args, rootId, data, reverseOrder: !config.swapSourceAndTarget })
		return processAssignmentToSymbol<OtherInfo & ParentInformation>({
			...config,
			name,
			source,
			target,
			args:        getEffectiveOrder(config, res.processedArguments as [DataflowInformation, DataflowInformation]),
			rootId,
			data,
			information: res.information,
		})
	} else if(config.canBeReplacement && type === RType.FunctionCall && named) {
		/* as replacement functions take precedence over the lhs fn-call (i.e., `names(x) <- ...` is independent from the definition of `names`), we do not have to process the call */
		dataflowLogger.debug(`Assignment ${name.content} has a function call as target => replacement function ${target.lexeme}`)
		const replacement = toReplacementSymbol(target, target.functionName.content, config.superAssignment ?? false)
		return processAsNamedCall(replacement, data, replacement.content, [...target.arguments, source])
	} else if(config.canBeReplacement && type === RType.Access) {
		dataflowLogger.debug(`Assignment ${name.content} has an access as target => replacement function ${target.lexeme}`)
		const replacement = toReplacementSymbol(target, target.operator, config.superAssignment ?? false)
		return processAsNamedCall(replacement, data, replacement.content, [toUnnamedArgument(target.accessed, data.completeAst.idMap), ...target.access, source])
	} else if(type === RType.String) {
		return processAssignmentToString(target, args, name, rootId, data, config, source)
	}

	dataflowLogger.warn(`Assignment ${name.content} has an unknown target type ${target.type}, skipping`)
	return processKnownFunctionCall({ name, args: effectiveArgs, rootId, data }).information
}

function extractSourceAndTarget<OtherInfo>(args: readonly RFunctionArgument<OtherInfo & ParentInformation>[], name: RSymbol<OtherInfo & ParentInformation>) {
	const source = unpackArgument(args[1])
	const target = unpackArgument(args[0])

	guard(source !== undefined, () => `Assignment ${name.content} has no source, impossible!`)
	guard(target !== undefined, () => `Assignment ${name.content} has no target, impossible!`)

	return { source, target }
}

function produceWrittenNodes<OtherInfo>(rootId: NodeId, target: DataflowInformation, isFunctionDef: boolean, data: DataflowProcessorInformation<OtherInfo>, makeMaybe: boolean): IdentifierDefinition[] {
	return target.in.map(ref => ({
		...ref,
		kind:                isFunctionDef ? 'function' : 'variable',
		definedAt:           rootId,
		controlDependencies: data.controlDependencies ?? (makeMaybe ? [] : undefined)
	}))
}

function processAssignmentToString<OtherInfo>(
	target: RString<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	name: RSymbol<OtherInfo & ParentInformation>,
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>,
	config: AssignmentConfiguration,
	source: RNode<OtherInfo & ParentInformation>
) {
	const symbol: RSymbol<OtherInfo & ParentInformation> = {
		type:      RType.Symbol,
		info:      target.info,
		content:   removeRQuotes(target.lexeme),
		lexeme:    target.lexeme,
		location:  target.location,
		namespace: undefined
	}

	// treat first argument to Symbol
	const mappedArgs = config.swapSourceAndTarget ? [args[0], {
		...(args[1] as RUnnamedArgument<OtherInfo & ParentInformation>),
		value: symbol
	}] : [{ ...(args[0] as RUnnamedArgument<OtherInfo & ParentInformation>), value: symbol }, args[1]]
	const res = processKnownFunctionCall({
		name,
		args:         mappedArgs,
		rootId,
		data,
		reverseOrder: !config.swapSourceAndTarget
	})

	return processAssignmentToSymbol<OtherInfo & ParentInformation>({
		...config,
		name,
		source,
		target:      symbol,
		args:        getEffectiveOrder(config, res.processedArguments as [DataflowInformation, DataflowInformation]),
		rootId,
		data,
		information: res.information
	})
}

function checkFunctionDef<OtherInfo>(source: RNode<OtherInfo & ParentInformation>, sourceInfo: DataflowInformation) {
	return sourceInfo.graph.getVertex(source.info.id)?.tag === VertexType.FunctionDefinition
}

export interface AssignmentToSymbolParameters<OtherInfo> extends AssignmentConfiguration {
	readonly name:        RSymbol<OtherInfo & ParentInformation>
	readonly source:      RNode<OtherInfo & ParentInformation>
	readonly args:        [DataflowInformation, DataflowInformation]
	readonly target:      RSymbol<OtherInfo & ParentInformation>
	readonly rootId:      NodeId
	readonly data:        DataflowProcessorInformation<OtherInfo>
	readonly information: DataflowInformation
}

/**
 * Helper function whenever it is known that the _target_ of an assignment is a (single) symbol (i.e. `x <- ...`, but not `names(x) <- ...`).
 */
function processAssignmentToSymbol<OtherInfo>({
	name,
	source,
	args: [targetArg, sourceArg],
	target,
	rootId,
	data,
	information,
	superAssignment,
	makeMaybe,
	quoteSource
}: AssignmentToSymbolParameters<OtherInfo>): DataflowInformation {
	const isFunctionDef = checkFunctionDef(source, sourceArg)

	const writeNodes = produceWrittenNodes(rootId, targetArg, isFunctionDef, data, makeMaybe ?? false)

	if(writeNodes.length !== 1 && log.settings.minLevel <= LogLevel.Warn) {
		log.warn(`Unexpected write number in assignment: ${JSON.stringify(writeNodes)}`)
	}

	// we drop the first arg which we use to pass along arguments :D
	const readFromSourceWritten = sourceArg.out.slice(1)
	const readTargets: readonly IdentifierReference[] = [{ nodeId: rootId, name: name.content, controlDependencies: data.controlDependencies }, ...sourceArg.unknownReferences, ...sourceArg.in, ...targetArg.in.filter(i => i.nodeId !== target.info.id), ...readFromSourceWritten]
	const writeTargets = [...writeNodes, ...writeNodes, ...readFromSourceWritten]

	information.environment = overwriteEnvironment(targetArg.environment, sourceArg.environment)

	// install assigned variables in environment
	for(const write of writeNodes) {
		information.environment = define(write, superAssignment, information.environment)
		information.graph.setDefinitionOfVertex(write)
		if(!quoteSource) {
			information.graph.addEdge(write, source.info.id, { type: EdgeType.DefinedBy })
		}
		information.graph.addEdge(write, rootId, { type: EdgeType.DefinedBy })
		// kinda dirty, but we have to remove existing read edges for the symbol, added by the child
		const out = information.graph.outgoingEdges(write.nodeId)
		for(const [id,edge] of (out?? [])) {
			edge.types &= ~EdgeType.Reads
			if(edge.types == 0) {
				out?.delete(id)
			}
		}
	}

	information.graph.addEdge(rootId, targetArg.entryPoint, { type: EdgeType.Returns })

	if(quoteSource) {
		information.graph.addEdge(rootId, source.info.id, { type: EdgeType.NonStandardEvaluation })
	}

	return {
		...information,
		unknownReferences: [],
		entryPoint:        rootId,
		in:                readTargets,
		out:               writeTargets
	}
}
