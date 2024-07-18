import type { NamedXmlBasedJson, XmlBasedJson } from '../input-format'
import { nameKey , contentKey , attributesKey , getKeysGuarded, XmlParseError } from '../input-format'



import type { SourceRange } from '../../../../../../util/range'
import { rangeFrom, rangeStartsCompletelyBefore } from '../../../../../../util/range'
import type { RawRType, RExpressionList, RNode } from '../../../model'
import { RType } from '../../../model'
import { guard } from '../../../../../../util/assert'

/**
 * if the passed object is an array with only one element, remove the array wrapper
 */
export function objectWithArrUnwrap(obj: XmlBasedJson[] | XmlBasedJson): XmlBasedJson {
	if(Array.isArray(obj)) {
		if(obj.length !== 1) {
			throw new XmlParseError(`expected only one element in the wrapped array, yet received ${JSON.stringify(obj)}`)
		}
		return obj[0]
	} else if(typeof obj === 'object') {
		return obj
	} else {
		throw new XmlParseError(`expected array or object, yet received ${JSON.stringify(obj)}`)
	}
}

/**
 * given a xml element, extract the source location of the corresponding element in the R-ast
 */
export function extractLocation(ast: JsonEntry): SourceRange {
	return rangeFrom(ast.line1, ast.col1, ast.line2, ast.col2)
}

/**
 * The json object that represents the input contains various meta-information.
 * This function extracts the meta-information and returns it.
 *
 * @param entry - The json object to extract the meta-information from
 */
export function retrieveMetaStructure(entry: JsonEntry): {
	/** the obj passed in, but potentially without surrounding array wrappers (see {@link objectWithArrUnwrap}) */
	entry:    JsonEntry
	/** location information of the corresponding R-ast element */
	location: SourceRange
	content:  string
} {
	const content = entry.text
	const location = extractLocation(entry)
	const unwrappedObj = objectWithArrUnwrap(obj)
	const attributes = obj[attributesKey] as XmlBasedJson | undefined
	guard(attributes !== undefined, () => `expected attributes to be defined for ${JSON.stringify(obj)}`)
	const content = obj[contentKey] as string | undefined ?? ''
	const location = extractLocation(attributes)
	return {
		entry,
		location,
		content
	}
}

export function assureTokenType(token: string, expectedName: RawRType): void {
	if(token !== expectedName) {
		throw new ParseError(`expected name to be ${expectedName}, yet received ${token}`)
	}
}

/**
 * Extract the token-type of the given object. This is based on the knowledge, that all json objects created
 * from the R xml have a name attached.
 *
 * @param content  - the json object to extract the token-type from
 */
export function getTokenType(content: XmlBasedJson): RawRType {
	return getKeysGuarded(content, nameKey) as RawRType
}

export function getWithTokenType(obj: XmlBasedJson[]) {
	return obj.map((content) => ({
		name: getTokenType(content),
		content
	}))
}

export function retrieveOpName(operator: NamedJsonEntry): string {
	/*
   * only real arithmetic ops have their operation as their own name, the others identify via content/text
   */
	return operator.content.text
}

/**
 * Ensure that the first child is completely before the second child.
 *
 * @param first  - the first child which should be the lhs
 * @param second - the second child which should be the rhs
 */
export function ensureChildrenAreLhsAndRhsOrdered(first: JsonEntry, second: JsonEntry): void {
	const firstOtherLoc = extractLocation(first)
	const secondOtherLoc = extractLocation(second)
	if(!rangeStartsCompletelyBefore(firstOtherLoc, secondOtherLoc)) {
		throw new ParseError(`expected the first child to be the lhs, yet received ${JSON.stringify(first)} & ${JSON.stringify(second)}`)
	}
}

export function ensureExpressionList<Info>(node: RNode<Info>): RExpressionList<Info> {
	if(node.type !== RType.ExpressionList) {
		return {
			type:     RType.ExpressionList,
			grouping: undefined,
			location: node.location,
			info:     node.info,
			lexeme:   undefined,
			children: [node]
		}
	}
	return node
}
