import { NamedXmlBasedJson, XmlParseError } from '../../input-format'
import { parseLog } from '../../parser'
import { ensureChildrenAreLhsAndRhsOrdered, retrieveMetaStructure, retrieveOpName } from '../meta'
import { identifySpecialOp } from './special'
import { ParserData } from '../../data'
import { tryNormalizeSingleNode } from '../structure'
import {
	ArithmeticOperatorsRAst,
	AssignmentsRAst,
	BinaryOperatorFlavor,
	ComparisonOperatorsRAst,
	LogicalOperatorsRAst,
	ModelFormulaOperatorsRAst,
	RBinaryOp, RFunctionCall, RNamedFunctionCall,
	RNode,
	RPipe,
	RSymbol,
	Type
} from '../../../../model'
import { executeHook, executeUnknownHook } from '../../hooks'
import { guard } from '../../../../../../../util/assert'

/**
 * Parsing binary operations includes the pipe, even though the produced PIPE construct is not a binary operation,
 * to ensure it is handled separately from the others (especially in the combination of a pipe bind)
 */
export function tryNormalizeBinary(
	data: ParserData,
	lhs: NamedXmlBasedJson,
	operator: NamedXmlBasedJson,
	rhs: NamedXmlBasedJson
): RNode | undefined {
	parseLog.trace(`binary op for ${lhs.name} [${operator.name}] ${rhs.name}`)
	let flavor: BinaryOperatorFlavor | 'special' | 'pipe'
	if (Type.Special === operator.name) {
		flavor = "special"
	} else if (ArithmeticOperatorsRAst.has(operator.name)) {
		flavor = "arithmetic"
	} else if (ComparisonOperatorsRAst.has(operator.name)) {
		flavor = "comparison"
	} else if (LogicalOperatorsRAst.has(operator.name)) {
		flavor = "logical"
	}  else if (ModelFormulaOperatorsRAst.has(operator.name)) {
		flavor = "model formula"
	} else if (AssignmentsRAst.has(operator.name)) {
		flavor = "assignment"
	} else if(operator.name === Type.Pipe) {
		flavor = 'pipe'
	} else {
		return executeUnknownHook(data.hooks.operators.onBinary.unknown, data, { lhs, operator, rhs })
	}
	return parseBinaryOp(data, flavor, lhs, operator, rhs)
}

function parseBinaryOp(data: ParserData, flavor: BinaryOperatorFlavor | 'special' | 'pipe', lhs: NamedXmlBasedJson, operator: NamedXmlBasedJson, rhs: NamedXmlBasedJson): RFunctionCall | RBinaryOp | RPipe {
	parseLog.debug(`[binary op] trying to parse ${flavor}`);
	({ flavor, lhs, rhs, operator } = executeHook(data.hooks.operators.onBinary.before, data, { flavor, lhs, operator, rhs }))

	ensureChildrenAreLhsAndRhsOrdered(data.config, lhs.content, rhs.content)
	let parsedLhs = tryNormalizeSingleNode(data, lhs)
	let parsedRhs = tryNormalizeSingleNode(data, rhs)

	if (parsedLhs === undefined || parsedRhs === undefined) {
		throw new XmlParseError(`unexpected under-sided binary op, received ${JSON.stringify([parsedLhs, parsedRhs])} for ${JSON.stringify([lhs, operator, rhs])}`)
	}

	const operationName = retrieveOpName(data.config, operator)

	// special support for strings in assignments
	if(flavor === 'assignment') {
		[parsedLhs, parsedRhs] = processLhsAndRhsForAssignment(data, operationName, parsedLhs, parsedRhs)
	}



	const { location, content } = retrieveMetaStructure(data.config, operator.content)

	if (flavor === 'special') {
		flavor = identifySpecialOp(content)
	}

	if(flavor === 'special') {
		guard(parsedLhs.location !== undefined && parsedLhs.lexeme !== undefined && parsedRhs.location !== undefined && parsedRhs.lexeme !== undefined,
			() => `special op lhs and rhs must have a locations and lexemes, but ${JSON.stringify(parsedLhs)} and ${JSON.stringify(parsedRhs)})`)
		// parse as infix function call!
		const result: RNamedFunctionCall = {
			type:         Type.FunctionCall,
			flavor:       'named',
			infixSpecial: true,
			lexeme:       data.currentLexeme ?? content,
			location,
			functionName: {
				type:      Type.Symbol,
				location,
				lexeme:    content,
				content,
				namespace: undefined,
				info:      {}
			},
			arguments: [
				{
					type:     Type.Argument,
					location: parsedLhs.location,
					value:    parsedLhs,
					name:     undefined,
					lexeme:   parsedLhs.lexeme,
					info:     {}
				},
				{
					type:     Type.Argument,
					location: parsedRhs.location,
					value:    parsedRhs,
					name:     undefined,
					lexeme:   parsedRhs.lexeme,
					info:     {}
				}
			],
			info: {}
		}
		return executeHook(data.hooks.operators.onBinary.after, data, result)
	}

	let result: RBinaryOp | RPipe
	if(flavor === 'pipe') {
		guard(parsedLhs.location !== undefined, () => `pipe lhs must have a location, but ${JSON.stringify(parsedLhs)})`)
		guard(parsedLhs.lexeme !== undefined, () => `pipe lhs must have a full lexeme, but ${JSON.stringify(parsedLhs)})`)
		result = {
			type: Type.Pipe,
			location,
			lhs:  {
				type:     Type.Argument,
				location: parsedLhs.location,
				value:    parsedLhs,
				name:     undefined,
				lexeme:   parsedLhs.lexeme,
				info:     {}
			},
			rhs:    parsedRhs,
			lexeme: content,
			info:   {
				fullRange:        data.currentRange,
				additionalTokens: [],
				fullLexeme:       data.currentLexeme
			}
		}
	} else {
		result = {
			type:     Type.BinaryOp,
			flavor,
			location,
			lhs:      parsedLhs,
			rhs:      parsedRhs,
			operator: operationName,
			lexeme:   content,
			info:     {
				fullRange:        data.currentRange,
				additionalTokens: [],
				fullLexeme:       data.currentLexeme
			}
		}
	}
	return executeHook(data.hooks.operators.onBinary.after, data, result)
}

function processLhsAndRhsForAssignment(data: ParserData, opName: string, parsedLhs: RNode, parsedRhs: RNode): [RNode, RNode] {
	const isRhs = opName === '->' || opName === '->>'
	const assigned = isRhs ? parsedRhs : parsedLhs
	if(assigned.type !== Type.String) {
		return [parsedLhs, parsedRhs]
	}

	// update the assigned value to be parsed as a symbol
	const result: RSymbol = {
		type:      Type.Symbol,
		lexeme:    assigned.lexeme,
		location:  assigned.location,
		content:   assigned.content.str,
		namespace: undefined,
		info:      assigned.info
	}
	return isRhs ? [parsedLhs, result] : [result, parsedRhs]
}

