import type { ReplCommand } from './main'
import type { OutputFormatter } from '../../../util/ansi'
import { FontStyles } from '../../../util/ansi'
import { PipelineExecutor } from '../../../core/pipeline-executor'
import { prepareParsedData } from '../../../r-bridge/lang-4.x/ast/parser/json/format'
import { convertPreparedParsedData } from '../../../r-bridge/lang-4.x/ast/parser/json/parser'
import type { XmlBasedJson } from '../../../r-bridge/lang-4.x/ast/parser/xml/input-format'
import { attributesKey, contentKey, childrenKey, getKeyGuarded } from '../../../r-bridge/lang-4.x/ast/parser/xml/input-format'
import { RawRType } from '../../../r-bridge/lang-4.x/ast/model/type'
import {
	extractLocation,
	getTokenType,
	objectWithArrUnwrap
} from '../../../r-bridge/lang-4.x/ast/parser/xml/normalize-meta'
import { DEFAULT_PARSE_PIPELINE } from '../../../core/steps/pipeline/default-pipelines'
import { fileProtocol, removeRQuotes, requestFromInput } from '../../../r-bridge/retriever'

type DepthList =  { depth: number, node: XmlBasedJson, leaf: boolean }[]

function toDepthMap(xml: XmlBasedJson): DepthList {
	const root = getKeyGuarded<XmlBasedJson>(xml, RawRType.ExpressionList)
	
	const visit: { depth: number, node: XmlBasedJson }[] = [ { depth: 0, node: root } ]
	const result: DepthList = []

	while(visit.length > 0) {
		const current = visit.pop()
		if(current === undefined) {
			continue
		}

		const children = current.node[childrenKey] as unknown as XmlBasedJson[] | undefined ?? []
		
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
	if(extracted[0] === extracted[2] && extracted[1] === extracted[3]) {
		return ` (${extracted[0]}:${extracted[1]})`
	} else {
		return ` (${extracted[0]}:${extracted[1]}─${extracted[2]}:${extracted[3]})`
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

		i++
	}
	return result
}


export const parseCommand: ReplCommand = {
	description:  `Prints ASCII Art of the parsed, unmodified AST, start with '${fileProtocol}' to indicate a file`,
	usageExample: ':parse',
	aliases:      [ 'p' ],
	script:       false,
	fn:           async(output, shell, remainingLine) => {
		const result = await new PipelineExecutor(DEFAULT_PARSE_PIPELINE, {
			shell,
			request: requestFromInput(removeRQuotes(remainingLine.trim()))
		}).allRemainingSteps()

		const object = convertPreparedParsedData(prepareParsedData(result.parse))

		output.stdout(depthListToTextTree(toDepthMap(object), output.formatter))
	}
}
