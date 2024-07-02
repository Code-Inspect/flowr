import type { NamedXmlBasedJson } from '../input-format'
import type { NormalizerData } from '../normalizer-data'
import { tryToNormalizeArgument } from './functions/normalize-argument'
import { parseLog } from '../../json/parser'
import { splitArrayOn } from '../../../../../../util/arrays'
import { guard } from '../../../../../../util/assert'
import { retrieveMetaStructure } from '../normalize-meta'
import { RawRType, RType } from '../../../model/type'
import { normalizeSingleNode } from './structure/normalize-single-node'
import type { RNode } from '../../../model/model'
import { EmptyArgument } from '../../../model/nodes/r-function-call'
import type { RAccess } from '../../../model/nodes/r-access'
import { normalizeExpressions } from './structure/normalize-expressions'
import type { RArgument } from '../../../model/nodes/r-argument'

function normalizeAbstractArgument(x: readonly NamedXmlBasedJson[], data: NormalizerData, operator: '$' | '@' | '[' | '[['): RArgument | typeof EmptyArgument {
	if(x.length === 0) {
		return EmptyArgument
	} else if(x.length !== 1 || x[0].name === RawRType.Expression) {
		const gotAccess = tryToNormalizeArgument(data, x)
		guard(gotAccess !== undefined, () => `expected one access result in access as argument, yet received ${JSON.stringify(gotAccess)} for ${JSON.stringify([operator, x])}`)
		return gotAccess
	} else {
		const node = normalizeSingleNode(data, x[0]) as RNode
		guard(node.type !== RType.ExpressionList, () => `expected expression list to be parsed as argument, yet received ${JSON.stringify(node)} for ${JSON.stringify(x)}`)
		return {
			type:     RType.Argument,
			location: node.location,
			lexeme:   node.lexeme,
			name:     undefined,
			value:    node,
			info:     {
				fullRange:        node.location,
				fullLexeme:       node.lexeme,
				additionalTokens: []
			}
		}
	}
}

/**
 * Tries to normalize the given data as access (e.g., indexing).
 *
 * @param data           - The data used by the parser (see {@link NormalizerData})
 * @param mappedWithName - The json object to extract the meta-information from
 *
 * @returns The parsed {@link RAccess} or `undefined` if the given construct is not accessing a value
 */
export function tryNormalizeAccess(data: NormalizerData, mappedWithName: NamedXmlBasedJson[]): RAccess | undefined {
	parseLog.trace('trying to parse access')

	if(mappedWithName.length < 3) {
		parseLog.trace('expected at least three elements are required to parse an access')
		return undefined
	}

	const accessOp = mappedWithName[1]

	let operator: RAccess['operator']
	let closingLength = 0

	switch(accessOp.name) {
		case RawRType.BracketLeft:
			operator = '['
			closingLength = 1
			break
		case RawRType.Dollar:
			operator = '$'
			break
		case RawRType.At:
			operator = '@'
			break
		case RawRType.DoubleBracketLeft:
			operator = '[['
			closingLength = 2
			break
		default:
			parseLog.trace(`expected second element to be an access operator, yet received ${accessOp.name}`)
			return undefined
	}

	const accessed = mappedWithName[0]
	if(accessed.name !== RawRType.Expression && accessed.name !== RawRType.ExprOfAssignOrHelp && accessed.name !== RawRType.LegacyEqualAssign) {
		parseLog.trace(`expected accessed element to be wrapped an expression, yet received ${accessed.name}`)
		return undefined
	}

	const parsedAccessed = normalizeExpressions(data, [accessed])
	if(parsedAccessed.length !== 1) {
		parseLog.trace(`expected accessed element to be wrapped an expression, yet received ${accessed.name}`)
		return undefined
	}

	const remaining = mappedWithName.slice(2, mappedWithName.length - closingLength)

	parseLog.trace(`${remaining.length} remaining arguments for access`)

	const splitAccessOnComma = splitArrayOn(remaining, x => x.name === RawRType.Comma)

	const parsedAccess: (RArgument | typeof EmptyArgument)[] = splitAccessOnComma.map(x => {
		return normalizeAbstractArgument(x, data, operator)
	})

	const { content, location } = retrieveMetaStructure(accessOp.content)

	return {
		type:     RType.Access,
		location,
		lexeme:   content,
		accessed: parsedAccessed[0],
		operator,
		access:   parsedAccess,
		info:     {
			fullRange:        data.currentRange,
			additionalTokens: [],
			fullLexeme:       data.currentLexeme
		}
	} as RAccess
}
