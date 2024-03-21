import type { XmlBasedJson } from '@eagleoutice/flowr/r-bridge'
import { fileProtocol , removeRQuotes , childrenKey , attributesKey, contentKey , getKeysGuarded, RawRType, requestFromInput } from '@eagleoutice/flowr/r-bridge'
import {
	extractLocation,
	getTokenType,
	objectWithArrUnwrap,
} from '@eagleoutice/flowr/r-bridge/lang-4.x/ast/parser/xml/internal'
import type { OutputFormatter } from '@eagleoutice/flowr/util/ansi'
import { FontStyles } from '@eagleoutice/flowr/util/ansi'
import type { ReplCommand } from './main'
import { SteppingSlicer } from '@eagleoutice/flowr/core'
import { prepareParsedData } from '@eagleoutice/flowr/r-bridge/lang-4.x/ast/parser/json/format'
import { convertPreparedParsedData } from '@eagleoutice/flowr/r-bridge/lang-4.x/ast/parser/json/parser'

type DepthList =  { depth: number, node: XmlBasedJson, leaf: boolean }[]

function toDepthMap(xml: XmlBasedJson): DepthList {
	const root = getKeysGuarded<XmlBasedJson>(xml, RawRType.ExpressionList)
	const visit = [ { depth: 0, node: root } ]
	const result: DepthList = []

	while(visit.length > 0) {
		const current = visit.pop()
		if(current === undefined) {
			continue
		}

		const children = current.node[childrenKey] as XmlBasedJson[] | undefined ?? []
		result.push({ ...current, leaf: children.length === 0 })
		children.reverse()

		const nextDepth = current.depth + 1

		visit.push(...children.map(c => ({ depth: nextDepth, node: c })))
	}
	return result
}

function lastElementInNesting(i: number, list: Readonly<DepthList>, depth: number): boolean {
	for(let j = i + 1; j < list.length; j++) {
		if(list[j].depth < depth) {
			return true
		}
		if(list[j].depth === depth) {
			return false
		}
	}
	// only more deeply nested come after
	return true
}


function initialIndentation(i: number, depth: number, deadDepths: Set<number>, nextDepth: number, list: Readonly<DepthList>, f: OutputFormatter): string {
	let result = `${i === 0 ? '' : '\n'}${f.getFormatString({ style: FontStyles.Faint })}`
	// we know there never is something on the same level as the expression list
	for(let d = 1; d < depth; d++) {
		result += deadDepths.has(d) ? '  ' : '│ '
	}

	if(nextDepth < depth) {
		result += '╰ '
	} else if(i > 0) {
		// check if we are maybe the last one with this depth until someone with a lower depth comes around
		const isLast = lastElementInNesting(i, list, depth)
		result += isLast ? '╰ ' : '├ '
		if(isLast) {
			deadDepths.add(depth)
		}
	}
	return result
}

function retrieveLocationString(locationRaw: XmlBasedJson) {
	const extracted = extractLocation(locationRaw)
	if(extracted.start.line === extracted.end.line && extracted.start.column === extracted.end.column) {
		return ` (${extracted.start.line}:${extracted.start.column})`
	} else {
		return ` (${extracted.start.line}:${extracted.start.column}─${extracted.end.line}:${extracted.end.column})`
	}
}

function depthListToTextTree(list: Readonly<DepthList>, f: OutputFormatter): string {
	let result = ''

	const deadDepths = new Set<number>()
	let i = 0
	for(const { depth, node, leaf } of list) {
		const nextDepth = i + 1 < list.length ? list[i + 1].depth : 0

		deadDepths.delete(depth)
		result += initialIndentation(i, depth, deadDepths, nextDepth, list, f)

		result += f.reset()

		const raw = objectWithArrUnwrap(node)
		const content = raw[contentKey] as string | undefined
		const locationRaw = raw[attributesKey] as XmlBasedJson | undefined
		let location = ''
		if(locationRaw !== undefined) {
			location = retrieveLocationString(locationRaw)
		}

		const type = getTokenType(node)

		if(leaf) {
			const suffix = `${f.format(content ? JSON.stringify(content) : '', { style: FontStyles.Bold })}${f.format(location, { style: FontStyles.Italic })}`
			result += `${type} ${suffix}`
		} else {
			result += f.format(type, { style: FontStyles.Bold })
		}

		i ++
	}
	return result
}


export const parseCommand: ReplCommand = {
	description:  `Prints ASCII Art of the parsed, unmodified AST, start with '${fileProtocol}' to indicate a file`,
	usageExample: ':parse',
	aliases:      [ 'p' ],
	script:       false,
	fn:           async(output, shell, remainingLine) => {
		const result = await new SteppingSlicer({
			stepOfInterest: 'parse',
			shell,
			request:        requestFromInput(removeRQuotes(remainingLine.trim()))
		}).allRemainingSteps()

		const object = convertPreparedParsedData(prepareParsedData(result.parse))

		output.stdout(depthListToTextTree(toDepthMap(object), output.formatter))
	}
}
