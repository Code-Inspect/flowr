/**
 * This module has one goal (and is to be rewritten soon to achieve that goal,
 * as the file itself is way too long). See {@link reconstructToCode}.
 * @module
 */

import { expensiveTrace, log, LogLevel } from '../util/log'
import { guard } from '../util/assert'
import type { MergeableRecord } from '../util/objects'
import type {
	NormalizedAst,
	ParentInformation,
	RNodeWithParent
} from '../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RExpressionList } from '../r-bridge/lang-4.x/ast/model/nodes/r-expression-list'
import type { RNode } from '../r-bridge/lang-4.x/ast/model/model'
import type { RBinaryOp } from '../r-bridge/lang-4.x/ast/model/nodes/r-binary-op'
import type { RPipe } from '../r-bridge/lang-4.x/ast/model/nodes/r-pipe'
import { RType } from '../r-bridge/lang-4.x/ast/model/type'
import type { RForLoop } from '../r-bridge/lang-4.x/ast/model/nodes/r-for-loop'
import type { RRepeatLoop } from '../r-bridge/lang-4.x/ast/model/nodes/r-repeat-loop'
import type { RIfThenElse } from '../r-bridge/lang-4.x/ast/model/nodes/r-if-then-else'
import type { RWhileLoop } from '../r-bridge/lang-4.x/ast/model/nodes/r-while-loop'
import type { RParameter } from '../r-bridge/lang-4.x/ast/model/nodes/r-parameter'
import type { RFunctionCall } from '../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import { EmptyArgument } from '../r-bridge/lang-4.x/ast/model/nodes/r-function-call'
import type { RAccess } from '../r-bridge/lang-4.x/ast/model/nodes/r-access'
import type { RArgument } from '../r-bridge/lang-4.x/ast/model/nodes/r-argument'
import type { RFunctionDefinition } from '../r-bridge/lang-4.x/ast/model/nodes/r-function-definition'
import type { StatefulFoldFunctions } from '../r-bridge/lang-4.x/ast/model/processing/stateful-fold'
import { foldAstStateful } from '../r-bridge/lang-4.x/ast/model/processing/stateful-fold'
import type { NodeId } from '../r-bridge/lang-4.x/ast/model/processing/node-id'
import { getRangeStart, SourcePosition, SourceRange } from '../util/range'
import { autoSelectLibrary, getIndentString, indentBy, isSelected, merge, plain, prettyPrintCodeToString, prettyPrintPartToString } from './helper'
import type { AutoSelectPredicate, Code, PrettyPrintLine, PrettyPrintLinePart } from './helper'

type Selection = ReadonlySet<NodeId>

export const reconstructLogger = log.getSubLogger({ name: 'reconstruct' })

const getLexeme = (n: RNodeWithParent) => n.info.fullLexeme ?? n.lexeme ?? ''

const reconstructAsLeaf = (leaf: RNodeWithParent, configuration: ReconstructionConfiguration): Code => {
	const selectionHasLeaf = configuration.selection.has(leaf.info.id) || configuration.autoSelectIf(leaf)
	return selectionHasLeaf ? foldToConst(leaf) : []
}

const foldToConst = (n: RNodeWithParent): Code => plain(getLexeme(n), n.location? getRangeStart(n.location) : [0, 0])

function reconstructExpressionList(exprList: RExpressionList<ParentInformation>, _grouping: [Code, Code] | undefined,  expressions: Code[], config: ReconstructionConfiguration): Code {
	const subExpressions = expressions.filter(e => e.length > 0)

	if(isSelected(config, exprList)) {
		const positionStart: SourcePosition = exprList.location? getRangeStart(exprList.location) : [0, 0]
		return plain(getLexeme(exprList), positionStart)
	}

	if(subExpressions.length === 0) {
		return []
	} else {
		const additionalTokens = reconstructAdditionalTokens(exprList)
		return merge(
			...subExpressions,
			...additionalTokens
		)
	}
}

function reconstructRawBinaryOperator(lhs: Code, n: string, rhs: Code): Code {
	return [  // inline pretty print
		...lhs.slice(0, lhs.length - 1),
		{ linePart: [{ part: `${prettyPrintCodeToString([lhs[lhs.length - 1]])} ${n} ${prettyPrintCodeToString([rhs[0]])}`, loc: lhs[lhs.length - 1].linePart[lhs.length - 1].loc }], indent: 0 },
		...rhs.slice(1, rhs.length)
	]
}

function reconstructUnaryOp(leaf: RNodeWithParent, operand: Code, configuration: ReconstructionConfiguration) {
	if(configuration.selection.has(leaf.info.id)) {
		return foldToConst(leaf)
	} else if(operand.length === 0) {
		return []
	} else {
		return foldToConst(leaf)
	}
}

function reconstructBinaryOp(n: RBinaryOp<ParentInformation> | RPipe<ParentInformation>, lhs: Code, rhs: Code, configuration: ReconstructionConfiguration): Code {
	if(isSelected(configuration, n)) {
		return plain(getLexeme(n), n.lhs.location?.start ?? n.location.start)
	}

	return reconstructRawBinaryOperator(lhs, n.type === RType.Pipe ? '|>' : n.operator, rhs)
}

function reconstructForLoop(loop: RForLoop<ParentInformation>, variable: Code, vector: Code, body: Code, configuration: ReconstructionConfiguration): Code {
	const start = loop.info.fullRange?.start //may be unnesseccary
	if(isSelected(configuration, loop)) {
		return plain(getLexeme(loop), start ?? loop.location.start)
	}
	if(isSelected(configuration, loop.body)) {
		return merge(body)
	}
	const additionalTokens = reconstructAdditionalTokens(loop)
	const vectorLocation: SourcePosition = loop.vector.location? loop.vector.location.start : vector[0].linePart[0].loc
	vectorLocation.column -= 1 //somehow the vector is consistently one space to late
	const reconstructedVector = plain(getLexeme(loop.vector), vectorLocation)

	if(variable.length === 0 && vector.length === 0 && body.length === 0) {
		return []
	}

	const out = merge(
		[{ linePart: [{ part: 'for', loc: start ?? getRangeStart(loop.location) }], indent: 0 }],
		[{ linePart: [{ part: getLexeme(loop.variable), loc: getRangeStart(loop.variable.location) }], indent: 0 }],
		reconstructedVector,
		...additionalTokens
	)
	//if body empty
	if(body.length < 1) {
		// puts {} with one space separation after for(...)
		const hBody = out[out.length - 1].linePart
		const bodyLoc = hBody[hBody.length - 1].loc
		out.push({ linePart: [{ part: '{}', loc: [bodyLoc[0], bodyLoc[1] + 2] }], indent: 0 })
		return out
	}
	//normal reconstruct
	out.push(...body)
	return merge(out)
}

//add heuristic to select needed semicollons
//maybe if expr 1,5 => select next semicollon
function reconstructAdditionalTokens(node: RNodeWithParent): Code[] {
	let out: Code[] = node.info.additionalTokens?.filter(t => t.lexeme && t.location)
		.map(t => plain(t.lexeme as string, getRangeStart((t.location? t.location : [0, 0]) as SourceRange)) ?? ([] as Code[])).filter(t => !(t === undefined)) as Code[]
	return out
}

function reconstructBodyWithHeader(header: PrettyPrintLine, body: Code, onEmpty: string): Code {
	const h = body[body.length - 1].linePart
	if(body.length === 0) {
		return [{ linePart: [{ part: `${prettyPrintPartToString(header.linePart, 0)}${onEmpty}`, loc: header.linePart[0].loc }], indent: header.indent }]
	} else if(body.length === 1) {
		return [
			{ linePart: [{ part: `${prettyPrintPartToString(header.linePart, 0)} ${body[0].linePart}`, loc: header.linePart[0].loc }], indent: header.indent }
		]
	} else if(body[0].linePart[0].part === '{' && h[h.length - 1].part === '}') {
		return [
			{ linePart: [{ part: `${prettyPrintPartToString(header.linePart, 0)} {`, loc: header.linePart[0].loc }], indent: header.indent },
			...body.slice(1, body.length - 1),
			{ linePart: [{ part: '}', loc: header.linePart[header.linePart.length - 1].loc }], indent: header.indent }
		]
	} else {
		return [
			header,
			...indentBy(body, 1)
		]
	}
}


//what is happening here???
function reconstructRepeatLoop(loop: RRepeatLoop<ParentInformation>, body: Code, configuration: ReconstructionConfiguration): Code {
	if(isSelected(configuration, loop)) {
		return body
	} else if(body.length === 0) {
		return []
	} else {
		const additionalTokens = reconstructAdditionalTokens(loop)
		return merge(
			[{linePart: [{part: 'repeat', loc: getRangeStart(loop.location)}], indent: 0}],
			body,
			...additionalTokens
		)
	}
}

//why is there pretty printing again??
function reconstructIfThenElse(ifThenElse: RIfThenElse<ParentInformation>, condition: Code, when: Code, otherwise: Code | undefined, configuration: ReconstructionConfiguration): Code {
	const startPos = getRangeStart(ifThenElse.location)
	//const endPos = ifThenElse.location.end
	//const conditionPos = ifThenElse.condition.location? ifThenElse.condition.location.start : { line: 0, column: 0 }

	if(isSelected(configuration, ifThenElse)) {
		return plain(getLexeme(ifThenElse), startPos)
	}
	otherwise ??= []

	if(condition.length === 0 && when.length === 0 && otherwise.length === 0) {
		return []
	}
	const additionalTokens = reconstructAdditionalTokens(ifThenElse)
	//console.log('additional Tokens: ', JSON.stringify(additionalTokens,jsonReplacer))

	let out = merge(
		...additionalTokens,
		[{ linePart: [{ part: `if(${getLexeme(ifThenElse.condition)})`, loc: startPos }], indent: 0 }],
		when
	)

	if(otherwise.length > 0 && !(otherwise[0].linePart.length === 2)) {
		//console.log('we have an else-body')
		const hBody = out[out.length - 1].linePart
		const elsePos = hBody[hBody.length - 1].loc
		const fakeWhenBlock = when.length === 0 ? [{ linePart: [{ part: ' {} ', loc: { line: elsePos.line, column: elsePos.column + 2 } }], indent: 0 }] : []
		const elseOffset = when.length === 0 ? 4 : 0
		out = merge(
			out,
			fakeWhenBlock,
			[{ linePart: [{ part: 'else', loc: { line: elsePos.line, column: elsePos.column + 2 +elseOffset } }], indent: 0 }], //may have to change the location
			otherwise
		)
 /*function reconstructIfThenElse(ifThenElse: RIfThenElse<ParentInformation>, condition: Code, then: Code, otherwise: Code | undefined, config: ReconstructionConfiguration): Code {
	otherwise ??= []
	if(then.length === 0 && otherwise.length === 0) {
		if(isSelected(config, ifThenElse)) {
			return [{ line: `if(${getLexeme(ifThenElse.condition)}) { }`, indent: 0 }]
		} else if(condition.length > 0) {
			return condition
		} else {
			return []
		}
	} else if(otherwise.length === 0) {
		if(isSelected(config, ifThenElse)) {
			return reconstructBodyWithHeader(
				{ line: `if(${getLexeme(ifThenElse.condition)})`, indent: 0 },
				then, '{}'
			)
		} else {
			return then
		}
	} else if(then.length === 0) {
		if(isSelected(config, ifThenElse)) {
			return reconstructBodyWithHeader(
				{ line: `if(${getLexeme(ifThenElse.condition)}) { } else`, indent: 0 },
				then, '{}'
			)
		} else {
			return otherwise
		}
	} else {
		const thenRemainder = indentBy(then.slice(1), 1)
		if(thenRemainder.length > 0) {
			if(!thenRemainder[thenRemainder.length - 1].line.trim().endsWith('else')) {
				thenRemainder[thenRemainder.length - 1].line += ' else '
			}
		}
		return [
			{ line: `if(${getLexeme(ifThenElse.condition)}) ${then[0].line} ${then.length === 1 ? 'else' : ''}`, indent: 0 },
			...thenRemainder,
			{ line: `${otherwise[0].line}`, indent: 0 },
			...indentBy(otherwise.splice(1), 1)
		]
	}
	*/
	return out
	}
}

function reconstructWhileLoop(loop: RWhileLoop<ParentInformation>, condition: Code, body: Code, configuration: ReconstructionConfiguration): Code {
	const start = getRangeStart(loop.location)
	if(isSelected(configuration, loop)) {
		return plain(getLexeme(loop), start)
	}
	const additionalTokens = reconstructAdditionalTokens(loop)
	const out = merge(
		[{ linePart: [{ part: `while(${getLexeme(loop.condition)})`, loc: start ?? getRangeStart(loop.location) }], indent: 0 }],
		...additionalTokens
	)
	if(body.length < 1) {
		//this puts {} one space after while(...)
		const hBody = out[out.length - 1].linePart
		const bodyLoc = [hBody[hBody.length - 1].loc[0], hBody[hBody.length - 1].loc[1] + hBody[hBody.length - 1].part.length]
		out.push({ linePart: [{ part: '{}', loc: [bodyLoc[0], bodyLoc[1] + 1] }], indent: 0 })
	} else {
		out.push(...body)
	}
	return merge(out)
}

function reconstructParameters(parameters: RParameter<ParentInformation>[]): string[] {
	// const baseParameters = parameters.flatMap(p => plain(getLexeme(p)))
	return parameters.map(p => {
		if(p.defaultValue !== undefined) {
			return `${getLexeme(p.name)}=${getLexeme(p.defaultValue)}`
		} else {
			return getLexeme(p)
		}
	})
}

function isNotEmptyArgument(a: Code | typeof EmptyArgument): a is Code {
	return a !== EmptyArgument
}

function reconstructFoldAccess(node: RAccess<ParentInformation>, accessed: Code, access: readonly (Code | typeof EmptyArgument)[], configuration: ReconstructionConfiguration): Code {

	const start = node.info.fullRange? getRangeStart(node.info.fullRange) : getRangeStart(node.location)

	if(isSelected(configuration, node)) {
		return plain(getLexeme(node), start)
	}

	if(accessed.length === 0) {
		return access.filter(isNotEmptyArgument).flat()
	} else if(access.every(a => a === EmptyArgument || a.length === 0)) {
		return accessed
	}

	return plain(getLexeme(node), start)
}

function reconstructArgument(argument: RArgument<ParentInformation>, name: Code | undefined, value: Code | undefined): Code {
	const start = getRangeStart(argument.location)

	if(argument.name !== undefined && name !== undefined && name.length > 0) {
		return plain(`${getLexeme(argument.name)}=${argument.value ? getLexeme(argument.value) : ''}`, start)
	} else {
		return value ?? []
	}
}


function reconstructParameter(parameter: RParameter<ParentInformation>, name: Code, defaultValue: unknown, configuration: ReconstructionConfiguration): Code {
	const start = getRangeStart(parameter.location)

	if(!isSelected(configuration, parameter)) {
		return []
	}
	if(parameter.defaultValue !== undefined && name.length > 0) {
		return plain(`${getLexeme(parameter.name)}=${getLexeme(parameter.defaultValue)}`, start)
	} else if(parameter.defaultValue !== undefined && name.length === 0) {
		return plain(getLexeme(parameter.defaultValue), start)
	} else {
		return name
	}
}

//what are we doing here??
function reconstructFunctionDefinition(definition: RFunctionDefinition<ParentInformation>, functionParameters: readonly Code[], body: Code, config: ReconstructionConfiguration): Code {
	// if a definition is not selected, we only use the body - slicing will always select the definition
	if(!isSelected(configuration, definition) && functionParameters.every(p => p.length === 0)) {
		return merge(body)
	}
	// if a definition is not selected, we only use the body - slicing will always select the definition
	if(functionParameters.every(p => p.length === 0)) {
		const empty = body === undefined || body.length === 0
		const selected = isSelected(config, definition)
		if(empty && selected) { // give function stub
			return plain(`function(${reconstructParameters(definition.parameters).join(', ')}) { }`)
		} else if(!selected) { // do not require function
			return body
		}
	}
	const parameters = reconstructParameters(definition.parameters).join(', ')
	if(body.length <= 1) {
		// 'inline'
		const bodyStr = body.length === 0 ? '{ }' : `${body[0].line}`
		// we keep the braces in every case because I do not like no-brace functions
		return [{ line: `function(${parameters}) ${bodyStr}`, indent: 0 }]
	} else {
		// 'block'
		return [
			{ line: `function(${parameters}) ${body[0].line}`, indent: 0 },
			...body.slice(1),
		]
	}

	if(isSelected(configuration, definition.body)) {
		const out = merge(body)
		const h = out[out.length - 1].linePart
		if(h[h.length - 1].part === ';') {
			out.pop()
		}
		return out
	}

	const startPos = definition.location.start
	const parameters = reconstructParameters(definition.parameters).join(', ')
	const additionalTokens = reconstructAdditionalTokens(definition)
	//body.length === 0 ? [{linePart: [{part: '', loc: startPos}], indent: 0}] : body.slice(1, body.length - 1)

	return merge(
		[{ linePart: [{ part: `function(${parameters})`, loc: startPos }], indent: 0 }],
		body,
		...additionalTokens
	)
}

function reconstructSpecialInfixFunctionCall(args: (Code | typeof EmptyArgument)[], call: RFunctionCall<ParentInformation>): Code {
	guard(args.length === 2, () => `infix special call must have exactly two arguments, got: ${args.length} (${JSON.stringify(args)})`)
	guard(call.flavor === 'named', `infix special call must be named, got: ${call.flavor}`)
	const [lhs, rhs] = args

	if((lhs === undefined || lhs.length === 0) && (rhs === undefined || rhs.length === 0)) {
		return []
	}
	// else if (rhs === undefined || rhs.length === 0) {
	// if rhs is undefined we still  have to keep both now, but reconstruct manually :/
	if(lhs !== EmptyArgument && lhs.length > 0) {
		const lhsText = lhs.map(l => `${getIndentString(l.indent)}${prettyPrintPartToString(l.linePart, 0)}`).join('\n')
		if(rhs !== EmptyArgument && rhs.length > 0) {
			const rhsText = rhs.map(l => `${getIndentString(l.indent)}${prettyPrintPartToString(l.linePart, 0)}`).join('\n')
			return plain(`${lhsText} ${call.functionName.content} ${rhsText}`, lhs[0].linePart[0].loc)
		} else {
			return plain(lhsText, getRangeStart(call.location))
		}
	}
	return plain(`${getLexeme(call.arguments[0] as RArgument<ParentInformation>)} ${call.functionName.content} ${getLexeme(call.arguments[1] as RArgument<ParentInformation>)}`, getRangeStart(call.location))
}

function reconstructFunctionCall(call: RFunctionCall<ParentInformation>, functionName: Code, args: (Code | typeof EmptyArgument)[], configuration: ReconstructionConfiguration): Code {
	const selected = isSelected(configuration, call)
	if(!selected) {
		const f = args.filter(a => a !== EmptyArgument && a.length !== 0) as Code[]
		if(f.length === 0) {
			return []
		} else if(f.length === 1) {
			return f[0]
		}
	}

	if(call.infixSpecial === true) {
		return reconstructSpecialInfixFunctionCall(args, call)
	}
	if(call.flavor === 'named' && selected) {
		return plain(getLexeme(call), getRangeStart(call.location))
	}
	const filteredArgs = args.filter(a => a !== undefined && a.length > 0)
	if(functionName.length === 0 && filteredArgs.length === 0) {
		return []
	}

	functionName = merge(functionName)
	if(args !== undefined) {
		const defArgs: Code[] = args as Code[]
		args = [merge(...defArgs)]
	}

	if(args.length === 0) {
		guard(functionName.length > 0, `without args, we need the function name to be present! got: ${JSON.stringify(functionName)}`)
		const last: PrettyPrintLinePart[] = functionName[functionName.length - 1].linePart
		if(call.flavor === 'unnamed' && !prettyPrintPartToString(last, 0).endsWith(')')) {
			functionName[0].linePart = [{ part: `(${prettyPrintPartToString(functionName[0].linePart, 0)}`, loc: functionName[0].linePart[0].loc}]
			last.push({ part: ')', loc: last[last.length - 1].loc })
		}

		if(!prettyPrintPartToString(last, 0).endsWith('()')) {
			// add empty call braces if not present
			last.push({ part: '()', loc: last[last.length - 1].loc })
		}
		return functionName
	} else {
		return plain(getLexeme(call), getRangeStart(call.location))
	}
}

export interface ReconstructionConfiguration extends MergeableRecord {
	selection:    Selection
	/** if true, this will force the ast part to be reconstructed, this can be used, for example, to force include `library` statements */
	autoSelectIf: AutoSelectPredicate
}

/**
 * The fold functions used to reconstruct the ast in {@link reconstructToCode}.
 */
// escalates with undefined if all are undefined
export const reconstructAstFolds: StatefulFoldFunctions<ParentInformation, ReconstructionConfiguration, Code> = {
	// we just pass down the state information so everyone has them
	down:         (_n, c) => c,
	foldNumber:   reconstructAsLeaf,
	foldString:   reconstructAsLeaf,
	foldLogical:  reconstructAsLeaf,
	foldSymbol:   reconstructAsLeaf,
	foldAccess:   reconstructFoldAccess,
	foldBinaryOp: reconstructBinaryOp,
	foldPipe:     reconstructBinaryOp,
	foldUnaryOp:  reconstructUnaryOp,
	other:        {
		foldComment:       reconstructAsLeaf,
		foldLineDirective: reconstructAsLeaf
	},
	loop: {
		foldFor:    reconstructForLoop,
		foldRepeat: reconstructRepeatLoop,
		foldWhile:  reconstructWhileLoop,
		foldBreak:  reconstructAsLeaf,
		foldNext:   reconstructAsLeaf
	},
	foldIfThenElse: reconstructIfThenElse,
	foldExprList:   reconstructExpressionList,
	functions:      {
		foldFunctionDefinition: reconstructFunctionDefinition,
		foldFunctionCall:       reconstructFunctionCall,
		foldParameter:          reconstructParameter,
		foldArgument:           reconstructArgument
	}
}


export interface ReconstructionResult {
	code:                  string
	/** number of lines that contain nodes that triggered the `autoSelectIf` predicate {@link reconstructToCode} */
	linesWithAutoSelected: number
}

function removeOuterExpressionListIfApplicable(result: PrettyPrintLine[], linesWithAutoSelected: number) {
	if(result.length > 1 && prettyPrintPartToString(result[0].linePart, 0) === '{' && prettyPrintPartToString(result[result.length - 1].linePart, 0) === '}') {
		// remove outer block
		return { code: prettyPrintCodeToString(indentBy(result.slice(1, result.length - 1), -1)), linesWithAutoSelected }
	} else {
		return { code: prettyPrintCodeToString(result), linesWithAutoSelected }
	}
}

/**
 * Reconstructs parts of a normalized R ast into R code on an expression basis.
 *
 * @param ast          - The {@link NormalizedAst|normalized ast} to be used as a basis for reconstruction
 * @param selection    - The selection of nodes to be reconstructed (probably the {@link NodeId|NodeIds} identified by the slicer)
 * @param autoSelectIf - A predicate that can be used to force the reconstruction of a node (for example to reconstruct library call statements, see {@link autoSelectLibrary}, {@link doNotAutoSelect})
 *
 * @returns The number of lines for which `autoSelectIf` triggered, as well as the reconstructed code itself.
 */
export function reconstructToCode<Info>(ast: NormalizedAst<Info>, selection: Selection, autoSelectIf: AutoSelectPredicate = autoSelectLibrary): ReconstructionResult {
	if(reconstructLogger.settings.minLevel <= LogLevel.Trace) {
		reconstructLogger.trace(`reconstruct ast with ids: ${JSON.stringify([...selection])}`)
	}

	// we use a wrapper to count the number of lines for which the autoSelectIf predicate triggered
	const linesWithAutoSelected = new Set<number>()
	const autoSelectIfWrapper = (node: RNode<ParentInformation>) => {
		const result = autoSelectIf(node)
		if(result && node.location) {
			for(let i = node.location[0]; i <= node.location[2]; i++){
				linesWithAutoSelected.add(i)
			}
		}
		return result
	}

	// fold of the normalized ast
	const result = foldAstStateful(ast.ast, { selection, autoSelectIf: autoSelectIfWrapper }, reconstructAstFolds)

	expensiveTrace(reconstructLogger, () => `reconstructed ast before string conversion: ${JSON.stringify(result)}`)

	return removeOuterExpressionListIfApplicable(result, linesWithAutoSelected.size)
}
}
