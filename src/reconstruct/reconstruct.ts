/**
 * This module has one goal (and is to be rewritten soon to achieve that goal,
 * as the file itself is way too long). See {@link reconstructToCode}.
 * @module
 */

import type {
	ParentInformation,
	RAccess,
	RArgument,
	RBinaryOp,
	RExpressionList,
	RForLoop,
	RFunctionCall,
	RFunctionDefinition,
	RIfThenElse,
	RNodeWithParent,
	RParameter,
	RRepeatLoop,
	RWhileLoop,
	RPipe,
	StatefulFoldFunctions } from '../r-bridge'
import { RType } from '../r-bridge'
import { log } from '../util/log'
import { guard, isNotNull } from '../util/assert'
import type { MergeableRecord } from '../util/objects'
import type {
	Selection,
	Code,
	AutoSelectPredicate } from './helper'
import {
	prettyPrintPartToString,
	plain,
	indentBy,
	isSelected,
	getIndentString,
	merge,
	prettyPrintCodeToString
} from './helper'
import type { SourcePosition, SourceRange } from '../util/range'
import { jsonReplacer } from '../util/json'


export const reconstructLogger = log.getSubLogger({ name: 'reconstruct' })

const getLexeme = (n: RNodeWithParent) => n.info.fullLexeme ?? n.lexeme ?? ''

const reconstructAsLeaf = (leaf: RNodeWithParent, configuration: ReconstructionConfiguration): Code => {
	const selectionHasLeaf = configuration.selection.has(leaf.info.id) || configuration.autoSelectIf(leaf)
	if(selectionHasLeaf) {
		return foldToConst(leaf)
	} else {
		return []
	}
	// reconstructLogger.trace(`reconstructAsLeaf: ${leaf.info.id} (${selectionHasLeaf ? 'y' : 'n'}):  ${JSON.stringify(wouldBe)}`)
	// return selectionHasLeaf ? wouldBe : []
}

const foldToConst = (n: RNodeWithParent): Code => plain(getLexeme(n), n.location? n.location.start : { line: 0, column: 0 })

function reconstructExpressionList(exprList: RExpressionList<ParentInformation>, expressions: Code[], configuration: ReconstructionConfiguration): Code {
	if(isSelected(configuration, exprList)) {
		const positionStart = exprList.location? exprList.location.start : { line: 0, column: 0 }
		return plain(getLexeme(exprList), positionStart)
	}

	const subExpressions = expressions.filter(e => e.length > 0)


	if(subExpressions.length === 0) {
		return []
	} else {
		const additionalTokens = reconstructAdditionalTokens(exprList)
		return merge([
			...subExpressions,
			...additionalTokens
		])
	}
}

function reconstructRawBinaryOperator(lhs: Code, n: string, rhs: Code): Code {
	return [  // inline pretty print
		...lhs.slice(0, lhs.length - 1),
		{ linePart: [{ part: `${prettyPrintCodeToString([lhs[lhs.length - 1]])} ${n} ${prettyPrintCodeToString([rhs[0]])}`, loc: lhs[lhs.length - 1].linePart[lhs.length - 1].loc }], indent: 0 },
		...indentBy(rhs.slice(1, rhs.length), 1)
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

	if(lhs.length === 0 && rhs.length === 0) {
		return []
	}
	if(lhs.length === 0) { // if we have no lhs, only return rhs
		return rhs
	}
	if(rhs.length === 0) {
		// if we have no rhs we have to keep everything to get the rhs
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
		return merge([body])
	}
	const additionalTokens = reconstructAdditionalTokens(loop)
	const vectorLocation: SourcePosition = loop.vector.location? loop.vector.location.start : vector[0].linePart[0].loc
	vectorLocation.column -= 1 //somehow the vector is consistently one space to late
	const reconstructedVector = plain(getLexeme(loop.vector), vectorLocation)

	if(variable.length === 0 && vector.length === 0 && body.length === 0) {
		return []
	}

	const out = merge([
		[{ linePart: [{ part: 'for', loc: start ?? loop.location.start }], indent: 0 }],
		[{ linePart: [{ part: getLexeme(loop.variable), loc: loop.variable.location.start }], indent: 0 }],
		reconstructedVector,
		...additionalTokens
	])
	//if body empty
	if(body.length < 1) {
		// puts {} with one space separation after for(...)
		const hBody = out[out.length - 1].linePart
		const bodyLoc = hBody[hBody.length - 1].loc
		out.push({ linePart: [{ part: '{}', loc: { line: bodyLoc.line, column: bodyLoc.column + 2 } }], indent: 0 })
		return out
	}
	//normal reconstruct
	out.push(...body)
	return merge([out])
}

//add heuristic to select needed semicollons
//maybe if expr 1,5 => select next semicollon
function reconstructAdditionalTokens(node: RNodeWithParent): Code[] {
	return node.info.additionalTokens?.filter(t => t.lexeme && t.location)
		.map(t => plain(t.lexeme as string, (t.location as SourceRange).start)) ?? []
}

function reconstructRepeatLoop(loop: RRepeatLoop<ParentInformation>, body: Code, configuration: ReconstructionConfiguration): Code {
	if(isSelected(configuration, loop)) {
		return plain(getLexeme(loop), loop.location.start)
	} else if(body.length === 0) {
		return []
	} else {
		const additionalTokens = reconstructAdditionalTokens(loop)
		return merge([
			[{ linePart: [{ part: 'repeat', loc: loop.location.start }], indent: 0 }],
			body,
			...additionalTokens
		])
	}
}

//make use of additional tokens
function reconstructIfThenElse(ifThenElse: RIfThenElse<ParentInformation>, condition: Code, when: Code, otherwise: Code | undefined, configuration: ReconstructionConfiguration): Code {
	const startPos = ifThenElse.location.start
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
	console.log('additional Tokens: ', JSON.stringify(additionalTokens,jsonReplacer))

	let out = merge([
		...additionalTokens,
		[{ linePart: [{ part: `if(${getLexeme(ifThenElse.condition)})`, loc: startPos }], indent: 0 }],
		when
	])

	/*
	if(!(when[0].linePart.length === 2)) {
		console.log('we have an if-body')
		out = merge([
			out,
			when
		])
	}
	*/
	if(!(otherwise[0].linePart.length === 2)) {
		console.log('we have an else-body')
		const hBody = out[out.length - 1].linePart
		const elsePos = hBody[hBody.length - 1].loc
		out = merge([
			out,
			[{ linePart: [{ part: 'else', loc: { line: elsePos.line, column: elsePos.column + 2 } }], indent: 0 }], //may have to change the location
			otherwise
		])
	}

	console.log('out: ', JSON.stringify(out,jsonReplacer))
	return out
}

function reconstructWhileLoop(loop: RWhileLoop<ParentInformation>, condition: Code, body: Code, configuration: ReconstructionConfiguration): Code {
	const start = loop.location.start
	if(isSelected(configuration, loop)) {
		return plain(getLexeme(loop), start)
	}
	const additionalTokens = reconstructAdditionalTokens(loop)
	const out = merge([
		[{ linePart: [{ part: `while(${getLexeme(loop.condition)})`, loc: start ?? loop.location.start }], indent: 0 }],
		...additionalTokens
	])
	if(body.length < 1) {
		//this puts {} one space after while(...)
		const hBody = out[out.length - 1].linePart
		const bodyLoc = { line: hBody[hBody.length - 1].loc.line, column: hBody[hBody.length - 1].loc.column + hBody[hBody.length - 1].part.length }
		out.push({ linePart: [{ part: '{}', loc: { line: bodyLoc.line, column: bodyLoc.column + 1 } }], indent: 0 })
	} else {
		out.push(...body)
	}
	return merge([out])
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

function reconstructFoldAccess(node: RAccess<ParentInformation>, accessed: Code, access: string | (Code | null)[], configuration: ReconstructionConfiguration): Code {
	const start = node.info.fullRange?.start ?? node.location.start

	if(isSelected(configuration, node)) {
		return plain(getLexeme(node), start)
	}

	if(accessed.length === 0) {
		if(typeof access === 'string') {
			return []
		} else {
			return access.filter(isNotNull).flat()
		}
	}

	return plain(getLexeme(node), start)
}

function reconstructArgument(argument: RArgument<ParentInformation>, name: Code | undefined, value: Code | undefined, configuration: ReconstructionConfiguration): Code {
	const start = argument.location.start
	if(isSelected(configuration, argument)) {
		return plain(getLexeme(argument), start)
	}

	if(argument.name !== undefined && name !== undefined && name.length > 0) {
		return plain(`${getLexeme(argument.name)}=${argument.value ? getLexeme(argument.value) : ''}`, start)
	} else {
		return value ?? []
	}
}

function reconstructParameter(parameter: RParameter<ParentInformation>, name: Code, value: Code | undefined, configuration: ReconstructionConfiguration): Code {
	const start = parameter.location.start
	if(isSelected(configuration, parameter)) {
		return plain(getLexeme(parameter), start)
	}

	if(parameter.defaultValue !== undefined && name.length > 0) {
		return plain(`${getLexeme(parameter.name)}=${getLexeme(parameter.defaultValue)}`, start)
	} else if(parameter.defaultValue !== undefined && name.length === 0) {
		return plain(getLexeme(parameter.defaultValue), start)
	} else {
		return name
	}
}

function reconstructFunctionDefinition(definition: RFunctionDefinition<ParentInformation>, functionParameters: Code[], body: Code, configuration: ReconstructionConfiguration): Code {
	// if a definition is not selected, we only use the body - slicing will always select the definition
	if(!isSelected(configuration, definition) && functionParameters.every(p => p.length === 0)) {
		return merge([body])
	}

	if(isSelected(configuration, definition.body)) {
		const out = merge([body])
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

	return merge([
		[{ linePart: [{ part: `function(${parameters})`, loc: startPos }], indent: 0 }],
		body,
		...additionalTokens
	])
}

function reconstructSpecialInfixFunctionCall(args: (Code | undefined)[], call: RFunctionCall<ParentInformation>): Code {
	guard(args.length === 2, () => `infix special call must have exactly two arguments, got: ${args.length} (${JSON.stringify(args)})`)
	guard(call.flavor === 'named', `infix special call must be named, got: ${call.flavor}`)
	const lhs = args[0]
	const rhs = args[1]

	if((lhs === undefined || lhs.length === 0) && (rhs === undefined || rhs.length === 0)) {
		return []
	}
	// else if (rhs === undefined || rhs.length === 0) {
	// if rhs is undefined we still  have to keep both now, but reconstruct manually :/
	if(lhs !== undefined && lhs.length > 0) {
		const lhsText = lhs.map(l => `${getIndentString(l.indent)}${prettyPrintPartToString(l.linePart, lhs[0].linePart[0].loc.column)}`).join('\n')
		if(rhs !== undefined && rhs.length > 0) {
			const rhsText = rhs.map(l => `${getIndentString(l.indent)}${prettyPrintPartToString(l.linePart, rhs[0].linePart[0].loc.column)}`).join('\n')
			return plain(`${lhsText} ${call.functionName.content} ${rhsText}`, call.location.start)
		} else {
			return plain(lhsText, call.location.start)
		}
	}
	return plain(`${getLexeme(call.arguments[0] as RArgument<ParentInformation>)} ${call.functionName.content} ${getLexeme(call.arguments[1] as RArgument<ParentInformation>)}`, call.location.start)
}

function reconstructFunctionCall(call: RFunctionCall<ParentInformation>, functionName: Code, args: (Code | undefined)[], configuration: ReconstructionConfiguration): Code {
	if(call.infixSpecial === true) {
		return reconstructSpecialInfixFunctionCall(args, call)
	}
	if(call.flavor === 'named' && isSelected(configuration, call)) {
		return plain(getLexeme(call), call.location.start)
	}
	const filteredArgs = args.filter(a => a !== undefined && a.length > 0)
	if(functionName.length === 0 && filteredArgs.length === 0) {
		return []
	}

	if(args.length === 0) {
		guard(functionName.length === 1, `without args, we need the function name to be present! got: ${JSON.stringify(functionName)}`)
		if(call.flavor === 'unnamed' && !functionName[0].linePart[functionName[0].linePart.length - 1].part.endsWith(')')) {
			functionName[0].linePart[0].part = `(${functionName[0].linePart[0].part})`
		}

		if(!functionName[0].linePart[functionName[0].linePart.length - 1].part.endsWith('()')) {
			// add empty call braces if not present
			functionName[0].linePart[functionName[0].linePart.length - 1].part += '()'
		}
		return [{ linePart: functionName[0].linePart, indent: functionName[0].indent }]
	} else {
		return plain(getLexeme(call), call.location.start)
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
	down:        (_n, c) => c,
	foldNumber:  reconstructAsLeaf,
	foldString:  reconstructAsLeaf,
	foldLogical: reconstructAsLeaf,
	foldSymbol:  reconstructAsLeaf,
	foldAccess:  reconstructFoldAccess,
	binaryOp:    {
		foldLogicalOp:    reconstructBinaryOp,
		foldArithmeticOp: reconstructBinaryOp,
		foldComparisonOp: reconstructBinaryOp,
		foldAssignment:   reconstructBinaryOp,
		foldPipe:         reconstructBinaryOp,
		foldModelFormula: reconstructBinaryOp
	},
	unaryOp: {
		foldArithmeticOp: reconstructUnaryOp,
		foldLogicalOp:    reconstructUnaryOp,
		foldModelFormula: reconstructUnaryOp
	},
	other: {
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
	code:         string
	/** number of nodes that triggered the `autoSelectIf` predicate {@link reconstructToCode} */
	autoSelected: number
}


