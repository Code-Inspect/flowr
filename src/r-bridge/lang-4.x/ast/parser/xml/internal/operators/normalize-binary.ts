import type { NormalizerData } from '../../normalizer-data'
import type { NamedXmlBasedJson } from '../../input-format'
import { XmlParseError } from '../../input-format'
import { parseLog } from '../../../json/parser'
import { ensureChildrenAreLhsAndRhsOrdered, retrieveMetaStructure, retrieveOpName } from '../../normalize-meta'
import { guard } from '../../../../../../../util/assert'
import { expensiveTrace } from '../../../../../../../util/log'
import { startAndEndsWith } from '../../../../../../../util/strings'
import type { RNode } from '../../../../model/model'
import { RawRType, RType } from '../../../../model/type'
import { OperatorsInRAst } from '../../../../model/operators'
import { normalizeSingleNode } from '../structure/normalize-single-node'
import type { RFunctionCall } from '../../../../model/nodes/r-function-call'
import type { RBinaryOp } from '../../../../model/nodes/r-binary-op'
import type { RPipe } from '../../../../model/nodes/r-pipe'


/**
 * Parsing binary operations includes the pipe, even though the produced PIPE construct is not a binary operation,
 * to ensure it is handled separately from the others (especially in the combination of a pipe bind)
 */
export function tryNormalizeBinary(
	data: NormalizerData,
	[lhs, operator, rhs]: [NamedXmlBasedJson, NamedXmlBasedJson, NamedXmlBasedJson]
): RNode | undefined {
	expensiveTrace(parseLog, () => `binary op for ${lhs.name} [${operator.name}] ${rhs.name}`)
	if(operator.name === RawRType.Special || OperatorsInRAst.has(operator.name) || operator.name === RawRType.Pipe) {
		return parseBinaryOp(data, lhs, operator, rhs)
	} else {
		return undefined
	}
}

function parseBinaryOp(data: NormalizerData, lhs: NamedXmlBasedJson, operator: NamedXmlBasedJson, rhs: NamedXmlBasedJson): RFunctionCall | RBinaryOp | RPipe {
	ensureChildrenAreLhsAndRhsOrdered(lhs.content, rhs.content)
	const parsedLhs = normalizeSingleNode(data, lhs)
	const parsedRhs = normalizeSingleNode(data, rhs)

	if(parsedLhs.type === RType.Delimiter || parsedRhs.type === RType.Delimiter) {
		throw new XmlParseError(`unexpected under-sided binary op, received ${JSON.stringify([parsedLhs, parsedRhs])} for ${JSON.stringify([lhs, operator, rhs])}`)
	}

	const operationName = retrieveOpName(operator)

	const { location, content } = retrieveMetaStructure(operator.content)

	if(startAndEndsWith(operationName, '%')) {
		const lhsLoc = parsedLhs.type === RType.ExpressionList ? parsedLhs.grouping?.[0].location : parsedLhs.location
		const rhsLoc = parsedRhs.type === RType.ExpressionList ? parsedRhs.grouping?.[0].location : parsedRhs.location

		guard(lhsLoc !== undefined && rhsLoc !== undefined,
			() => `special op lhs and rhs must have a locations, but ${JSON.stringify(parsedLhs)} || ${JSON.stringify(lhsLoc)} and ${JSON.stringify(parsedRhs)} ||  || ${JSON.stringify(rhsLoc)})`)
		// parse as infix function call!
		return {
			type:         RType.FunctionCall,
			named:        true,
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
					location: lhsLoc,
					value:    parsedLhs,
					name:     undefined,
					lexeme:   parsedLhs.lexeme ?? '',
					info:     {}
				},
				{
					type:     RType.Argument,
					location: rhsLoc,
					value:    parsedRhs,
					name:     undefined,
					lexeme:   parsedRhs.lexeme ?? '',
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
