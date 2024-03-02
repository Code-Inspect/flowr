import type { ParserData } from '../../data'
import type { NamedXmlBasedJson } from '../../input-format'
import { XmlParseError } from '../../input-format'
import type {
	RBinaryOp, RFunctionCall,
	RNode, RPipe, RSymbol
} from '../../../../model'
import {
	RType,
	OperatorsInRAst,
	RawRType,
	OperatorDatabase
} from '../../../../model'
import { parseLog } from '../../../json/parser'
import { ensureChildrenAreLhsAndRhsOrdered, retrieveMetaStructure, retrieveOpName } from '../../meta'
import { tryNormalizeSingleNode } from '../structure'
import { guard } from '../../../../../../../util/assert'
import { expensiveTrace } from '../../../../../../../util/log'
import { startAndEndsWith } from '../../../../../../../util/strings'


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
	expensiveTrace(parseLog, () => `binary op for ${lhs.name} [${operator.name}] ${rhs.name}`)
	if(operator.name === RawRType.Special || OperatorsInRAst.has(operator.name) || operator.name === RawRType.Pipe) {
		return parseBinaryOp(data, lhs, operator, rhs)
	} else {
		return undefined
	}
}

function parseBinaryOp(data: ParserData, lhs: NamedXmlBasedJson, operator: NamedXmlBasedJson, rhs: NamedXmlBasedJson): RFunctionCall | RBinaryOp | RPipe {
	ensureChildrenAreLhsAndRhsOrdered(lhs.content, rhs.content)
	let parsedLhs = tryNormalizeSingleNode(data, lhs)
	let parsedRhs = tryNormalizeSingleNode(data, rhs)

	if(parsedLhs.type === RType.Delimiter || parsedRhs.type === RType.Delimiter) {
		throw new XmlParseError(`unexpected under-sided binary op, received ${JSON.stringify([parsedLhs, parsedRhs])} for ${JSON.stringify([lhs, operator, rhs])}`)
	}

	const operationName = retrieveOpName(operator)

	// special support for strings in assignments
	// TODO: move to df
	if(OperatorDatabase[operationName]?.usedAs === 'assignment') {
		[parsedLhs, parsedRhs] = processLhsAndRhsForAssignment(operationName, parsedLhs, parsedRhs)
	}



	const { location, content } = retrieveMetaStructure(operator.content)

	if(startAndEndsWith(operationName, '%')) {
		guard(parsedLhs.location !== undefined && parsedLhs.lexeme !== undefined && parsedRhs.location !== undefined && parsedRhs.lexeme !== undefined,
			() => `special op lhs and rhs must have a locations and lexemes, but ${JSON.stringify(parsedLhs)} and ${JSON.stringify(parsedRhs)})`)
		// parse as infix function call!
		return {
			type:         RType.FunctionCall,
			flavor:       'named',
			infixSpecial: true,
			lexeme:       data.currentLexeme ?? content,
			location,
			functionName: {
				type:      RType.Symbol,
				location,
				lexeme:    content,
				content,
				namespace: undefined,
				info:      {}
			},
			arguments: [
				{
					type:     RType.Argument,
					location: parsedLhs.location,
					value:    parsedLhs,
					name:     undefined,
					lexeme:   parsedLhs.lexeme,
					info:     {}
				},
				{
					type:     RType.Argument,
					location: parsedRhs.location,
					value:    parsedRhs,
					name:     undefined,
					lexeme:   parsedRhs.lexeme,
					info:     {}
				}
			],
			info: {}
		}
	} else if(operator.name === RawRType.Pipe) {
		guard(parsedLhs.location !== undefined, () => `pipe lhs must have a location, but ${JSON.stringify(parsedLhs)})`)
		guard(parsedLhs.lexeme !== undefined, () => `pipe lhs must have a full lexeme, but ${JSON.stringify(parsedLhs)})`)
		return {
			type: RType.Pipe,
			location,
			lhs:  {
				type:     RType.Argument,
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
		return {
			type:     RType.BinaryOp,
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
}

function processLhsAndRhsForAssignment(opName: string, parsedLhs: RNode, parsedRhs: RNode): [RNode, RNode] {
	const isRhs = opName === '->' || opName === '->>'
	const assigned = isRhs ? parsedRhs : parsedLhs
	if(assigned.type !== RType.String) {
		return [parsedLhs, parsedRhs]
	}

	// update the assigned value to be parsed as a symbol
	const result: RSymbol = {
		type:      RType.Symbol,
		lexeme:    assigned.lexeme,
		location:  assigned.location,
		content:   assigned.content.str,
		namespace: undefined,
		info:      assigned.info
	}
	return isRhs ? [parsedLhs, result] : [result, parsedRhs]
}
