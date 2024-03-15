import type { FlowrCapability } from './types'
import { flowrCapabilities } from './data'

const supportedSymbolMap: Map<string, string> = new Map([
	['not', ':red_circle:'],
	['partially', ':large_orange_diamond:'],
	['fully', ':green_square:']
])

function printSingleCapability(depth: number, index: number, capability: FlowrCapability) {
	const indent = '    '.repeat(depth)
	const indexStr = index.toString().padStart(2, ' ')
	const nextLineIndent = '  '.repeat(depth + indexStr.length)
	const mainLine = `${indent}${indexStr}. **${capability.name}** (<a id='${capability.id}'>\`${capability.id}\`</a>)`
	let nextLine = ''

	if(capability.supported) {
		nextLine += `${supportedSymbolMap.get(capability.supported)} `
	}
	if(capability.description) {
		nextLine += capability.description
	}
	if(capability.note) {
		nextLine += `\\\n${nextLineIndent}_${capability.note}_`
	}
	return nextLine ? `${mainLine}\\\n${nextLineIndent}${nextLine}` : mainLine
}

function printAsMarkdown(capabilities: readonly FlowrCapability[], depth = 0, lines: string[] = []): string {
	for(let i = 0; i < capabilities.length; i++) {
		const capability = capabilities[i]
		const result = printSingleCapability(depth, i + 1, capability)
		lines.push(result)
		if(capability.capabilities) {
			printAsMarkdown(capability.capabilities, depth + 1, lines)
		}
	}
	return lines.join('\n')
}

function getPreamble(): string {
	const currentDateAndTime = new Date().toISOString().replace('T', ', ').replace(/\.\d+Z$/, ' UTC')
	return `
# Flowr Capabilities

_This document was generated automatically from '${module.filename}' on ${currentDateAndTime}_

The code-font behind each capability name is a link to the capability's id. This id can be used to reference the capability in a labeled test within flowR.
Besides we use colored bullets like this:

| <!-- -->               | <!-- -->                                              |
| ---------------------- | ----------------------------------------------------- |
| :green_square:         | _flowR_ is capable of handling this feature fully     |
| :large_orange_diamond: | _flowR_ is capable of handling this feature partially |
| :red_circle:           | _flowR_ is not capable of handling this feature       |

:cloud: This could be a feature diagram... :cloud:

`
}

/** if we run this script, we want a markdown representation of the capabilities */
if(require.main === module) {
	console.log(getPreamble() + printAsMarkdown(flowrCapabilities.capabilities))
}
