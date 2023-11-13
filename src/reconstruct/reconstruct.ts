/**
 * This module has one goal (and is to be rewritten soon to achieve that goal,
 * as the file itself is way too long). See {@link reconstructToCode}.
 * @module
 */

//imports {note: as of current, do not change}
import {
	NodeId,
	ParentInformation,
	RAccess,
	RArgument,
	RBinaryOp,
	RExpressionList,
	RForLoop,
	RFunctionCall,
	RFunctionDefinition,
	RIfThenElse,
	RNode,
	RNodeWithParent,
	RParameter,
	RRepeatLoop,
	RWhileLoop,
	RType,
	RPipe,
	StatefulFoldFunctions
} from '../r-bridge'
import { log } from '../util/log'
import { guard, isNotNull } from '../util/assert'
import { MergeableRecord } from '../util/objects'

/*
--helper function--
*/
export type Selection = Set<NodeId>
interface PrettyPrintLine {
	line:   string
	indent: number
}
function plain(text: string): PrettyPrintLine[] {
	return [{ line: text, indent: 0 }]
}
type Code = PrettyPrintLine[]


/*
--logger--
*/
export const reconstructLogger = log.getSubLogger({ name: 'reconstruct' })

/*
--helper function--
*/
const getLexeme = (n: RNodeWithParent) => n.info.fullLexeme ?? n.lexeme ?? ''

/*
--reconstruct--
*/
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

const foldToConst = (n: RNodeWithParent): Code => plain(getLexeme(n))

//look up exact function
/*
--helper function--
*/
function indentBy(lines: Code, indent: number): Code {
	return lines.map(({ line, indent: i }) => ({ line, indent: i + indent }))
}

/*
--reconstruct--
*/
function reconstructExpressionList(exprList: RExpressionList<ParentInformation>, expressions: Code[], configuration: ReconstructionConfiguration): Code {
	if(isSelected(configuration, exprList)) {
		return plain(getLexeme(exprList))
	}

	const subExpressions = expressions.filter(e => e.length > 0)
	if(subExpressions.length === 0) {
		return []
	} else if(subExpressions.length === 1) {
		return subExpressions[0]
	} else {
		return [
			{ line: '{', indent: 0 },
			...indentBy(subExpressions.flat(), 1),
			{ line: '}', indent: 0 }
		]
	}
}

/*
--helper function--
*/
function isSelected(configuration: ReconstructionConfiguration, n: RNode<ParentInformation>) {
	return configuration.selection.has(n.info.id) || configuration.autoSelectIf(n)
}

/*
--reconstruct--
*/
function reconstructRawBinaryOperator(lhs: PrettyPrintLine[], n: string, rhs: PrettyPrintLine[]) {
	return [  // inline pretty print
		...lhs.slice(0, lhs.length - 1),
		{ line: `${lhs[lhs.length - 1].line} ${n} ${rhs[0].line}`, indent: 0 },
		...indentBy(rhs.slice(1, rhs.length), 1)
	]
}

/*
--reconstruct--
*/
function reconstructUnaryOp(leaf: RNodeWithParent, operand: Code, configuration: ReconstructionConfiguration) {
	if(configuration.selection.has(leaf.info.id)) {
		return foldToConst(leaf)
	}
	else if(operand.length === 0) {
		return []
	} else {
		return foldToConst(leaf)
	}
}

/*
--reconstruct--
*/
function reconstructBinaryOp(n: RBinaryOp<ParentInformation> | RPipe<ParentInformation>, lhs: Code, rhs: Code, configuration: ReconstructionConfiguration): Code {
	if(isSelected(configuration, n)) {
		return plain(getLexeme(n))
	}

	if(lhs.length === 0 && rhs.length === 0) {
		return []
	}
	if(lhs.length === 0) { // if we have no lhs, only return rhs
		return rhs
	}
	if(rhs.length === 0) { // if we have no rhs we have to keep everything to get the rhs
		return plain(getLexeme(n))
	}

	return reconstructRawBinaryOperator(lhs, n.type === RType.Pipe ? '|>' : n.operator, rhs)
}

/*
--reconstruct--
*/
function reconstructForLoop(loop: RForLoop<ParentInformation>, variable: Code, vector: Code, body: Code, configuration: ReconstructionConfiguration): Code {
	if(isSelected(configuration, loop)) {
		return plain(getLexeme(loop))
	}
	if(body.length === 0 && variable.length === 0 && vector.length === 0) {
		return []
	} else {
		if(body.length <= 1) {
			// 'inline'
			return [{ line: `for(${getLexeme(loop.variable)} in ${getLexeme(loop.vector)}) ${body.length === 0 ? '{}' : body[0].line}`, indent: 0 }]
		} else if(body[0].line === '{' && body[body.length - 1].line === '}') {
			// 'block'
			return [
				{ line: `for(${getLexeme(loop.variable)} in ${getLexeme(loop.vector)}) {`, indent: 0 },
				...body.slice(1, body.length - 1),
				{ line: '}', indent: 0 }
			]
		} else {
			// unknown
			return [
				{ line: `for(${getLexeme(loop.variable)} in ${getLexeme(loop.vector)})`, indent: 0 },
				...indentBy(body, 1)
			]
		}
	}
}

/*
--reconstruct--
*/
function reconstructRepeatLoop(loop: RRepeatLoop<ParentInformation>, body: Code, configuration: ReconstructionConfiguration): Code {
	if(isSelected(configuration, loop)) {
		return plain(getLexeme(loop))
	} else if(body.length === 0) {
		return []
	} else {
		if(body.length <= 1) {
			// 'inline'
			return [{ line: `repeat ${body.length === 0 ? '{}' : body[0].line}`, indent: 0 }]
		} else if(body[0].line === '{' && body[body.length - 1].line === '}') {
			// 'block'
			return [
				{ line: 'repeat {', indent: 0 },
				...body.slice(1, body.length - 1),
				{ line: '}', indent: 0 }
			]
		} else {
			// unknown
			return [
				{ line: 'repeat', indent: 0 },
				...indentBy(body, 1)
			]
		}
	}
}

/*
--helper function--
*/
function removeExpressionListWrap(code: Code) {
	if(code.length > 0 && code[0].line === '{' && code[code.length - 1].line === '}') {
		return indentBy(code.slice(1, code.length - 1), -1)
	} else {
		return code
	}
}

/*
--reconstruct--
*/
function reconstructIfThenElse(ifThenElse: RIfThenElse<ParentInformation>, condition: Code, when: Code, otherwise: Code | undefined, configuration: ReconstructionConfiguration): Code {
	if(isSelected(configuration, ifThenElse)) {
		return plain(getLexeme(ifThenElse))
	}
	otherwise ??= []
	if(condition.length === 0 && when.length === 0 && otherwise.length === 0) {
		return []
	}
	if(otherwise.length === 0 && when.length === 0) {
		return [
			{ line: `if(${getLexeme(ifThenElse.condition)}) { }`, indent: 0 }
		]
	} else if(otherwise.length === 0) {
		return [
			{ line: `if(${getLexeme(ifThenElse.condition)}) {`, indent: 0 },
			...indentBy(removeExpressionListWrap(when), 1),
			{ line: '}', indent: 0 }
		]
	} else if(when.length === 0) {
		return [
			{ line: `if(${getLexeme(ifThenElse.condition)}) { } else {`, indent: 0 },
			...indentBy(removeExpressionListWrap(otherwise), 1),
			{ line: '}', indent: 0 }
		]
	} else {
		return [
			{ line: `if(${getLexeme(ifThenElse.condition)}) {`, indent: 0 },
			...indentBy(removeExpressionListWrap(when), 1),
			{ line: '} else {', indent: 0 },
			...indentBy(removeExpressionListWrap(otherwise), 1),
			{ line: '}', indent: 0 }
		]
	}
}

/*
--reconstruct--
*/
function reconstructWhileLoop(loop: RWhileLoop<ParentInformation>, condition: Code, body: Code, configuration: ReconstructionConfiguration): Code {
	if(isSelected(configuration, loop)) {
		return plain(getLexeme(loop))
	}
	if(body.length === 0 && condition.length === 0) {
		return []
	} else {
		if(body.length <= 1) {
			// 'inline'
			return [{ line: `while(${getLexeme(loop.condition)}) ${body.length === 0 ? '{}' : body[0].line}`, indent: 0 }]
		} else if(body[0].line === '{' && body[body.length - 1].line === '}') {
			// 'block'
			return [
				{ line: `while(${getLexeme(loop.condition)}) {`, indent: 0 },
				...body.slice(1, body.length - 1),
				{ line: '}', indent: 0 }
			]
		} else {
			// unknown
			return [
				{ line: `while(${getLexeme(loop.condition)})`, indent: 0 },
				...indentBy(body, 1)
			]
		}
	}
}

/*
--reconstruct--
*/
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


//foldAccess?? Arrayzugriffe
/*
--reconstruct--
*/
function reconstructFoldAccess(node: RAccess<ParentInformation>, accessed: Code, access: string | (Code | null)[], configuration: ReconstructionConfiguration): Code {
	if(isSelected(configuration, node)) {
		return plain(getLexeme(node))
	}

	if(accessed.length === 0) {
		if(typeof access === 'string') {
			return []
		} else {
			return access.filter(isNotNull).flat()
		}
	}

	return plain(getLexeme(node))
}

/*
--reconstruct--
*/
function reconstructArgument(argument: RArgument<ParentInformation>, name: Code | undefined, value: Code | undefined, configuration: ReconstructionConfiguration): Code {
	if(isSelected(configuration, argument)) {
		return plain(getLexeme(argument))
	}

	if(argument.name !== undefined && name !== undefined && name.length > 0) {
		return plain(`${getLexeme(argument.name)}=${argument.value ? getLexeme(argument.value) : ''}`)
	} else {
		return value ?? []
	}
}

/*
--reconstruct--
*/
function reconstructParameter(parameter: RParameter<ParentInformation>, name: Code, value: Code | undefined, configuration: ReconstructionConfiguration): Code {
	if(isSelected(configuration, parameter)) {
		return plain(getLexeme(parameter))
	}

	if(parameter.defaultValue !== undefined && name.length > 0) {
		return plain(`${getLexeme(parameter.name)}=${getLexeme(parameter.defaultValue)}`)
	} else if(parameter.defaultValue !== undefined && name.length === 0) {
		return plain(getLexeme(parameter.defaultValue))
	} else {
		return name
	}
}

/*
--reconstruct--
*/
function reconstructFunctionDefinition(definition: RFunctionDefinition<ParentInformation>, functionParameters: Code[], body: Code, configuration: ReconstructionConfiguration): Code {
	// if a definition is not selected, we only use the body - slicing will always select the definition
	if(!isSelected(configuration, definition) && functionParameters.every(p => p.length === 0)) {
		return body
	}
	const parameters = reconstructParameters(definition.parameters).join(', ')
	if(body.length <= 1) {
		// 'inline'
		const bodyStr = body.length === 0 ? '' : `${body[0].line} ` /* add suffix space */
		// we keep the braces in every case because I do not like no-brace functions
		return [{ line: `function(${parameters}) { ${bodyStr}}`, indent: 0 }]
	} else if(body[0].line === '{' && body[body.length - 1].line === '}') {
		// 'block'
		return [
			{ line: `function(${parameters}) {`, indent: 0 },
			...body.slice(1, body.length - 1),
			{ line: '}', indent: 0 }
		]
	} else {
		// unknown -> we add the braces just to be sure
		return [
			{ line: `function(${parameters}) {`, indent: 0 },
			...indentBy(body, 1),
			{ line: '}', indent: 0 }
		]
	}

}

/*
--reconstruct--
*/
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
		const lhsText = lhs.map(l => `${getIndentString(l.indent)}${l.line}`).join('\n')
		if(rhs !== undefined && rhs.length > 0) {
			const rhsText = rhs.map(l => `${getIndentString(l.indent)}${l.line}`).join('\n')
			return plain(`${lhsText} ${call.functionName.content} ${rhsText}`)
		} else {
			return plain(lhsText)
		}
	}
	return plain(`${getLexeme(call.arguments[0] as RArgument<ParentInformation>)} ${call.functionName.content} ${getLexeme(call.arguments[1] as RArgument<ParentInformation>)}`)
}

/*
--reconstruct--
*/
function reconstructFunctionCall(call: RFunctionCall<ParentInformation>, functionName: Code, args: (Code | undefined)[], configuration: ReconstructionConfiguration): Code {
	if(call.infixSpecial === true) {
		return reconstructSpecialInfixFunctionCall(args, call)
	}
	if(call.flavor === 'named' && isSelected(configuration, call)) {
		return plain(getLexeme(call))
	}
	const filteredArgs = args.filter(a => a !== undefined && a.length > 0)
	if(functionName.length === 0 && filteredArgs.length === 0) {
		return []
	}

	if(args.length === 0) {
		guard(functionName.length === 1, `without args, we need the function name to be present! got: ${JSON.stringify(functionName)}`)
		if(call.flavor === 'unnamed' && !functionName[0].line.endsWith(')')) {
			functionName[0].line = `(${functionName[0].line})`
		}

		if(!functionName[0].line.endsWith('()')) {
			// add empty call braces if not present
			functionName[0].line += '()'
		}
		return [{ line: functionName[0].line, indent: functionName[0].indent }]
	} else {
		return plain(getLexeme(call))
	}
}

/*
--helper function--
*/
/** The structure of the predicate that should be used to determine if a given normalized node should be included in the reconstructed code independent of if it is selected by the slice or not */
export type AutoSelectPredicate = (node: RNode<ParentInformation>) => boolean

/*
--interface--
*/
interface ReconstructionConfiguration extends MergeableRecord {
	selection:    Selection
	/** if true, this will force the ast part to be reconstructed, this can be used, for example, to force include `library` statements */
	autoSelectIf: AutoSelectPredicate
}

/*
--helper function--
*/
export function doNotAutoSelect(_node: RNode<ParentInformation>): boolean {
	return false
}

/*
--helper function--
*/
const libraryFunctionCall = /^(library|require|((require|load|attach)Namespace))$/

/*
--helper function--
*/
export function autoSelectLibrary(node: RNode<ParentInformation>): boolean {
	if(node.type !== RType.FunctionCall || node.flavor !== 'named') {
		return false
	}
	return libraryFunctionCall.test(node.functionName.content)
}


/*
--reconstruct--
*/
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


/*
--helper function--
*/
function getIndentString(indent: number): string {
	return ' '.repeat(indent * 4)
}

/*
--helper function--
*/
function prettyPrintCodeToString(code: Code, lf ='\n'): string {
	return code.map(({ line, indent }) => `${getIndentString(indent)}${line}`).join(lf)
}

/*
--interface--
*/
export interface ReconstructionResult {
	code:         string
	/** number of nodes that triggered the `autoSelectIf` predicate {@link reconstructToCode} */
	autoSelected: number
}

/*
--helper function--
*/
export function removeOuterExpressionListIfApplicable(result: PrettyPrintLine[], autoSelected: number) {
	if(result.length > 1 && result[0].line === '{' && result[result.length - 1].line === '}') {
		// remove outer block
		return { code: prettyPrintCodeToString(indentBy(result.slice(1, result.length - 1), -1)), autoSelected }
	} else {
		return { code: prettyPrintCodeToString(result), autoSelected }
	}
}


