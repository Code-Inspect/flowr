import type { NodeId, ParentInformation, RFunctionArgument, RSymbol } from '../../r-bridge'
import { EmptyArgument } from '../../r-bridge'
import type { DataflowProcessorInformation } from '../processor'
import type { DataflowInformation } from '../info'
import { processKnownFunctionCall } from '../internal/process/functions/call/known-call-handling'
import { EdgeType } from '../graph'
import { processSourceCall } from '../internal/process/functions/call/built-in/built-in-source'
import { processAccess } from '../internal/process/functions/call/built-in/built-in-access'
import { processIfThenElse } from '../internal/process/functions/call/built-in/built-in-if-then-else'
import { processAssignment } from '../internal/process/functions/call/built-in/built-in-assignment'
import { processSpecialBinOp } from '../internal/process/functions/call/built-in/built-in-logical-bin-op'
import { processPipe } from '../internal/process/functions/call/built-in/built-in-pipe'
import { processForLoop } from '../internal/process/functions/call/built-in/built-in-for-loop'
import { processRepeatLoop } from '../internal/process/functions/call/built-in/built-in-repeat-loop'
import { processWhileLoop } from '../internal/process/functions/call/built-in/built-in-while-loop'
import type { Identifier, IdentifierDefinition, IdentifierReference } from './identifier'
import { guard } from '../../util/assert'
import { processReplacementFunction } from '../internal/process/functions/call/built-in/built-in-replacement'
import { processQuote } from '../internal/process/functions/call/built-in/built-in-quote'

export const BuiltIn = 'built-in'

export type BuiltInIdentifierProcessor = <OtherInfo>(
	name:   RSymbol<OtherInfo & ParentInformation>,
	args:   readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data:   DataflowProcessorInformation<OtherInfo & ParentInformation>,
) => DataflowInformation

export type BuiltInIdentifierProcessorWithConfig<Config> = <OtherInfo>(
	name:   RSymbol<OtherInfo & ParentInformation>,
	args:   readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data:   DataflowProcessorInformation<OtherInfo & ParentInformation>,
	config: Config
) => DataflowInformation

export interface BuiltInIdentifierDefinition extends IdentifierReference {
	kind:      'built-in-function'
	definedAt: typeof BuiltIn
	processor: BuiltInIdentifierProcessor
}

export interface BuiltInIdentifierConstant<T = unknown> extends IdentifierReference {
	kind:      'built-in-value'
	definedAt: typeof BuiltIn
	value:     T
}

function defaultBuiltInProcessor<OtherInfo>(
	name: RSymbol<OtherInfo & ParentInformation>,
	args: readonly RFunctionArgument<OtherInfo & ParentInformation>[],
	rootId: NodeId,
	data: DataflowProcessorInformation<OtherInfo & ParentInformation>,
	config: { returnsNthArgument?: number | 'last', cfg?: 'return' | 'break' | 'next' }
): DataflowInformation {
	const res: DataflowInformation = processKnownFunctionCall(name, args, rootId, data).information
	if(config.returnsNthArgument !== undefined) {
		const arg = config.returnsNthArgument === 'last' ? args[args.length - 1] : args[config.returnsNthArgument]
		if(arg !== undefined && arg !== EmptyArgument) {
			res.graph.addEdge(rootId, arg.info.id, { type: EdgeType.Returns })
		}
	}
	switch(config.cfg) {
		case 'return':
			res.returns = [...res.returns, rootId]
			break
		case 'break':
			res.breaks = [...res.breaks, rootId]
			break
		case 'next':
			res.nexts = [...res.nexts, rootId]
			break

	}
	return res
}

export function registerBuiltInFunctions<Config, Proc extends BuiltInIdentifierProcessorWithConfig<Config>>(
	processor: Proc,
	config: Config,
	...names: readonly Identifier[]
): void {
	for(const name of names) {
		guard(!BuiltInMemory.has(name), `Built-in ${name} already defined`)
		BuiltInMemory.set(name, [{
			kind:              'built-in-function',
			definedAt:         BuiltIn,
			controlDependency: undefined,
			processor:         (name, args, rootId, data) => processor(name, args, rootId, data, config),
			name,
			nodeId:            BuiltIn
		}])
	}
}

/* registers all combinations of replacements */
export function registerReplacementFunctions(
	standardConfig: {makeMaybe?: boolean},
	assignments: readonly ('<-' | '<<-')[],
	...prefixes: readonly Identifier[]
): void {
	for(const assignment of assignments) {
		for(const prefix of prefixes) {
			const effectiveName = `${prefix}${assignment}`
			guard(!BuiltInMemory.has(effectiveName), `Built-in ${effectiveName} already defined`)
			BuiltInMemory.set(effectiveName, [{
				kind:              'built-in-function',
				definedAt:         BuiltIn,
				processor:         (name, args, rootId, data) => processReplacementFunction(name, args, rootId, data, { ...standardConfig, assignmentOperator: assignment }),
				name:              effectiveName,
				controlDependency: undefined,
				nodeId:            BuiltIn
			}])
		}
	}
}


function registerSimpleFunctions(...names: readonly Identifier[]): void {
	registerBuiltInFunctions(defaultBuiltInProcessor, {}, ...names)
}

function registerBuiltInConstant<T>(name: Identifier, value: T): void {
	guard(!BuiltInMemory.has(name), `Built-in ${name} already defined`)
	BuiltInMemory.set(name, [{
		kind:              'built-in-value',
		definedAt:         BuiltIn,
		controlDependency: undefined,
		value,
		name,
		nodeId:            BuiltIn
	}])
}

export const BuiltInMemory = new Map<Identifier, IdentifierDefinition[]>()

registerBuiltInConstant('NULL', null)
registerBuiltInConstant('NA', null)
registerBuiltInConstant('TRUE', true)
registerBuiltInConstant('T', true)
registerBuiltInConstant('FALSE', false)
registerBuiltInConstant('F', false)
registerSimpleFunctions('~', '+', '-', '*', '/', '^', '!', '?', '**', '==', '!=', '>', '<', '>=', '<=', '%%', '%/%', '%*%', ':')
registerBuiltInFunctions(defaultBuiltInProcessor, {},                                                   'cat') /* returns null */
registerBuiltInFunctions(defaultBuiltInProcessor, { returnsNthArgument: 0 },                            'print', '(')
registerBuiltInFunctions(defaultBuiltInProcessor, { returnsNthArgument: 0, cfg: 'return' as const },    'return')
registerBuiltInFunctions(defaultBuiltInProcessor, {  cfg: 'break' as const },                           'break')
registerBuiltInFunctions(defaultBuiltInProcessor, {  cfg: 'next' as const },                            'next')
registerBuiltInFunctions(defaultBuiltInProcessor, { returnsNthArgument: 'last' as const },              '{')
registerBuiltInFunctions(processSourceCall,       {},                                                   'source')
registerBuiltInFunctions(processAccess,           { treatIndicesAsString: false },                      '[', '[[')
registerBuiltInFunctions(processAccess,           { treatIndicesAsString: true },                       '$', '@')
registerBuiltInFunctions(processIfThenElse,       {},                                                   'if')
registerBuiltInFunctions(processAssignment,       {},                                                   '<-', ':=', '=', 'assign', 'delayedAssign')
registerBuiltInFunctions(processAssignment,       { superAssignment: true },                            '<<-')
registerBuiltInFunctions(processAssignment,       { swapSourceAndTarget: true },                        '->')
registerBuiltInFunctions(processAssignment,       { superAssignment: true, swapSourceAndTarget: true }, '->>')
registerBuiltInFunctions(processSpecialBinOp,     { lazy: true },                                       '&&', '||', '&', '|')
registerBuiltInFunctions(processPipe,             {},                                                   '|>')
registerBuiltInFunctions(processQuote,            { quoteArgumentsWithIndex: new Set([1]) },            'quote', 'substitute', 'bquote')
registerBuiltInFunctions(processForLoop,          {},                                                   'for')
registerBuiltInFunctions(processRepeatLoop,       {},                                                   'repeat')
registerBuiltInFunctions(processWhileLoop,        {},                                                   'while')
/* they are all mapped to `<-` but we separate super assignments */
registerReplacementFunctions({ makeMaybe: true },  ['<-', '<<-'], '[', '[[', '$', '@', 'names', 'dimnames', 'attributes', 'attr', 'class', 'levels', 'rownames', 'colnames')
