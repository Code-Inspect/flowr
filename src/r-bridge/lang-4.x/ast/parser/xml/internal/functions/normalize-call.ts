import type { NormalizerData } from '../../normalizer-data'
import type { NamedXmlBasedJson, XmlBasedJson } from '../../input-format'
import { childrenKey, getKeyGuarded } from '../../input-format'
import type {
	RArgument,
	RBreak,
	RFunctionCall,
	RNamedFunctionCall,
	RNext,
	RNode,
	RUnnamedFunctionCall
} from '../../../../model'
import { RawRType, RType, EmptyArgument } from '../../../../model'
import { parseLog } from '../../../json/parser'
import { getWithTokenType, retrieveMetaStructure } from '../../normalize-meta'
import { splitArrayOn } from '../../../../../../../util/arrays'
import { guard } from '../../../../../../../util/assert'
import { tryToNormalizeArgument } from './normalize-argument'
import type { SourceRange } from '../../../../../../../util/range'
import { normalizeExpression } from '../expression'
import { normalizeString, tryNormalizeSymbol } from '../values'

/**
 * Tries to parse the given data as a function call.
 *
 * @param data           - The data used by the parser (see {@link NormalizerData})
 * @param mappedWithName - The json object to extract the meta-information from
 *
 * @returns The parsed {@link RFunctionCall} (either named or unnamed) or `undefined` if the given construct is not a function call
 * May return a {@link RNext} or {@link RBreak} as `next()` and `break()` work as such.
 */
export function tryNormalizeFunctionCall(data: NormalizerData, mappedWithName: NamedXmlBasedJson[]): RFunctionCall | RNext | RBreak | undefined {
	const fnBase = mappedWithName[0]
	if(fnBase.name !== RawRType.Expression && fnBase.name !== RawRType.ExprOfAssignOrHelp) {
		parseLog.trace(`expected function call name to be wrapped an expression, yet received ${fnBase.name}`)
		return undefined
	}

	if(mappedWithName.length < 3 || mappedWithName[1].name !== RawRType.ParenLeft || mappedWithName[mappedWithName.length - 1].name !== RawRType.ParenRight) {
		parseLog.trace('expected function call to have parenthesis for a call, but was not')
		return undefined
	}

	parseLog.trace('trying to parse function call')

	const { unwrappedObj, content, location } = retrieveMetaStructure(fnBase.content)
	const symbolContent: XmlBasedJson[] = getKeyGuarded(unwrappedObj, childrenKey)

	const namedSymbolContent = getWithTokenType(symbolContent)

	if(namedSymbolContent.length === 1 && namedSymbolContent[0].name === RawRType.StringConst) {
		// special handling when someone calls a function by string
		return parseNamedFunctionCall(data, namedSymbolContent, mappedWithName, location, content)
	} else if(namedSymbolContent.findIndex(x => x.name === RawRType.SymbolFunctionCall) < 0) {
		parseLog.trace(`is not named function call, as the name is not of type ${RType.FunctionCall}, but: ${namedSymbolContent.map(n => n.name).join(',')}`)
		const mayResult = tryParseUnnamedFunctionCall(data, mappedWithName, location, content)
		return mayResult
	} else {
		return parseNamedFunctionCall(data, namedSymbolContent, mappedWithName, location, content)
	}
}

function parseArguments(mappedWithName: readonly NamedXmlBasedJson[], data: NormalizerData): (RArgument | undefined)[] {
	const argContainer = mappedWithName.slice(1)
	guard(argContainer.length > 1 && argContainer[0].name === RawRType.ParenLeft && argContainer[argContainer.length - 1].name === RawRType.ParenRight, 'expected args in parenthesis')
	const splitArgumentsOnComma = splitArrayOn(argContainer.slice(1, argContainer.length - 1), x => x.name === RawRType.Comma)
	return splitArgumentsOnComma.map(x => {
		parseLog.trace('trying to parse argument')
		return tryToNormalizeArgument(data, x)
	})
}

function tryParseUnnamedFunctionCall(data: NormalizerData, mappedWithName: NamedXmlBasedJson[], location: SourceRange, content: string): RUnnamedFunctionCall | RNext | RBreak | undefined {
	// maybe remove symbol-content again because I just use the root expr of mapped with name
	if(mappedWithName.length < 3) {
		parseLog.trace('expected unnamed function call to have 3 elements [like (<func>)], but was not')
		return undefined
	}

	parseLog.trace('Assuming structure to be a function call')

	// we parse an expression to allow function calls
	const calledFunction = normalizeExpression(data, mappedWithName[0].content)
	const parsedArguments = parseArguments(mappedWithName, data)

	if(parsedArguments.length === 0) {
		// sadly, next() and break() work
		if(calledFunction.type === RType.Next) {
			return {
				type:   RType.Next,
				lexeme: content,
				location,
				info:   {
					fullRange:        data.currentRange,
					additionalTokens: [],
					fullLexeme:       data.currentLexeme
				}
			}
		} else if(calledFunction.type === RType.Break) {
			return {
				type:   RType.Break,
				lexeme: content,
				location,
				info:   {
					fullRange:        data.currentRange,
					additionalTokens: [],
					fullLexeme:       data.currentLexeme
				}
			}
		}
	}

	return {
		type:           RType.FunctionCall,
		flavor:         'unnamed',
		location,
		lexeme:         content,
		calledFunction: calledFunction,
		arguments:      parsedArguments.map(x => x ?? EmptyArgument),
		info:           {
			fullRange:        data.currentRange,
			additionalTokens: [],
			fullLexeme:       data.currentLexeme
		}
	}
}


function parseNamedFunctionCall(data: NormalizerData, symbolContent: NamedXmlBasedJson[], mappedWithName: NamedXmlBasedJson[], location: SourceRange, content: string): RNamedFunctionCall {
	let functionName: RNode | undefined
	if(symbolContent.length === 1 && symbolContent[0].name === RawRType.StringConst) {
		const stringBase = normalizeString(data, symbolContent[0].content)
		functionName = {
			type:      RType.Symbol,
			namespace: undefined,
			lexeme:    stringBase.lexeme,
			info:      stringBase.info,
			location:  stringBase.location,
			content:   stringBase.content.str
		}
	} else {
		functionName = tryNormalizeSymbol(data, symbolContent)
	}
	guard(functionName !== undefined, 'expected function name to be a symbol, yet received none')
	guard((functionName as RNode).type === RType.Symbol, () => `expected function name to be a symbol, yet received ${JSON.stringify(functionName)}`)

	const parsedArguments = parseArguments(mappedWithName, data)

	return {
		type:      RType.FunctionCall,
		flavor:    'named',
		location,
		lexeme:    content,
		functionName,
		arguments: parsedArguments.map(x => x ?? EmptyArgument),
		info:      {
			fullRange:        data.currentRange,
			additionalTokens: [],
			fullLexeme:       data.currentLexeme
		}
	}
}
