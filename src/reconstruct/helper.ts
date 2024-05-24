import type { NodeId } from '../r-bridge/lang-4.x/ast/model/processing/node-id'
import type { ParentInformation } from '../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { RNode } from '../r-bridge/lang-4.x/ast/model/model'
import { RType } from '../r-bridge/lang-4.x/ast/model/type'
import type { SourcePosition } from '../util/range'
import {ReconstructionConfiguration} from "./reconstruct";
//Is this deprecated?

export type Code = PrettyPrintLine[]
export type Selection = ReadonlySet<NodeId>
export interface PrettyPrintLinePart {
	part: string
	loc:  SourcePosition
}
export interface PrettyPrintLine {
	linePart: PrettyPrintLinePart[]
	indent:   number
}

/**
 * Splits text on linebreak to create lineParts and encapsulates them in the Code type
 */
export function plain(text: string, location: SourcePosition): Code {
	const printLine: PrettyPrintLine = { linePart: [], indent: 0 }
	const split = text.split('\n')
	let locationLine = location[0]

	for(const line of split) {
		printLine.linePart.push({ part: line, loc: [locationLine++, location[1]] })
	}
	return [printLine]
}
export function plainSplit(text: string, location: SourcePosition): Code {
	const printLine: PrettyPrintLine = { linePart: [], indent: 0 }
	let i = 0
	let token = ''
	let currLoc: SourcePosition = [location[0], location[1]]
	while(i < text.length) {
		if(text[i] === ' ') {
			if(!(token === '')) {
				printLine.linePart.push({ part: token, loc: currLoc })
			}
			currLoc = [currLoc[0], currLoc[1] + token.length + 1]
			token = ''
		} else if(text[i] === '\n') {
			printLine.linePart.push({ part: token, loc: currLoc })
			currLoc = [currLoc[0] + 1, location[1]]
			token = ''
		} else {
			token = token.concat(text[i])
		}
		i++
	}
	printLine.linePart.push({ part: token, loc: currLoc })
	return [printLine]
}

/**
 * this function will merge up to n code pieces into a singular code piece, garanting that there are no duplicate lines and all lines are in order
 */
export function merge(...snipbits: Code[]): Code {
	const buckets: PrettyPrintLine[] = []
	const result: Code = []

	//separate and group lineParts by lines
	for(const code of snipbits) {
		for(const line of code) {
			for(const part of line.linePart) {
				const lineNumber = part.loc[0]
				if(buckets[lineNumber] === undefined) {	//may be necessary as empty elements count as undefined and we don't want to reassign filled buckets
					buckets[lineNumber] = { linePart: [], indent: line.indent }
				}
				buckets[lineNumber].linePart.push(part)
			}
		}
	}

	//sort buckets by column and stich lines into single code piece
	for(const line of buckets) {
		if(line === undefined){ //appears to be necessary as 'buckets' may be sparse (empty elements count as undefined)
			continue
		}
		line.linePart.sort((a, b) => a.loc[1] - b.loc[1])
		result.push(line)
	}

	return result
}

export function prettyPrintPartToString(line: PrettyPrintLinePart[],columnOffset: number): string {
	if(line.length === 0) {
		return ''
	}
	line.sort((a, b) => a.loc[1] - b.loc[1])
	let result = ''
	for(const part of line) {
		const currLength = result.length + columnOffset
		//we have to 0 any negative values as they can happen???
		result += ' '.repeat(Math.max(part.loc[1] - currLength, 0))
		result = result.concat(part.part)
	}
	return result
}

export function indentBy(lines: Code, indent: number): Code {
	return lines.map(({ linePart, indent: i }) => ({ linePart, indent: i + indent }))
}

export function isSelected(configuration: ReconstructionConfiguration, n: RNode<ParentInformation>) {
	return configuration.selection.has(n.info.id) || configuration.autoSelectIf(n)
}

export function removeExpressionListWrap(code: Code) {
	if(code.length > 0 && code[0].linePart[0].part === '{' && code[code.length - 1].linePart[code[code.length - 1].linePart.length - 1].part === '}') {
		return indentBy(code.slice(1, code.length - 1), -1)
	} else {
		return code
	}
}

/** The structure of the predicate that should be used to determine if a given normalized node should be included in the reconstructed code independent of if it is selected by the slice or not */
export type AutoSelectPredicate = (node: RNode<ParentInformation>) => boolean

export function doNotAutoSelect(_node: RNode<ParentInformation>): boolean {
	return false
}

export const libraryFunctionCall = /^(library|require|((require|load|attach)Namespace))$/

export function autoSelectLibrary(node: RNode<ParentInformation>): boolean {
	if(node.type !== RType.FunctionCall || node.flavor !== 'named') {
		return false
	}
	return libraryFunctionCall.test(node.functionName.content)
}

export function getIndentString(indent: number): string {
	return ' '.repeat(indent * 4)
}

/*
function dist(pos1: number, pos2: number) {
	Math.abs(pos1 - pos2)
}
*/

function addSemis(code: Code): Code {

	function contains(array: string[], elem: string): boolean {
		if(elem === '<-' || elem === '->' || elem === '<<-' || elem === '->>') {
			return true
		}
		if(elem === 'in' || elem === ' {} ') {
			return true
		}
		for(const arrElem of array) {
			if(elem === arrElem) {
				return true
			}
		}
		return false
	}
	const line: PrettyPrintLinePart[][] = []
	const specialChar = ['+', '-', '*', '/', ':', '<-', '->', '<<-', '->>', '$', '$$', '&', '&&', '||', '?', '<', '>', '=', '<=', '>=', '==', '(', ')', '{', '}', '[', '[[', ']', ']]']
	for(const elem of code) {
		let currLine = 1
		for(const linePart of elem.linePart) {
			currLine = linePart.loc[0]
			if(line[currLine] === undefined) {
				line[currLine] = []
			}
			line[currLine].push(linePart)
		}
	}

	for(const lineElements of line) {
		if(lineElements === undefined) {
			continue
		}
		const heuristic = { assignment: false, brackets: false, lastChar: lineElements[0], statement: false, addedSemi: false, curlyBrackets: false }
		let possibleSemi = heuristic.lastChar.loc
		lineElements.splice(0, 1)
		for(const elem of lineElements) {

			const lastChar = heuristic.lastChar.part
			heuristic.brackets = lastChar[lastChar.length - 1] === ')'
			heuristic.curlyBrackets = lastChar[lastChar.length - 1] === '}'
			heuristic.statement = !contains(specialChar, heuristic.lastChar.part)

			if(heuristic.addedSemi) {
				heuristic.assignment = false
			}

			//check if the current element may be followed by a semicolon
			if(elem.part[elem.part.length - 1] === ')') {
				//closing brackets
				possibleSemi = updateSemi(possibleSemi, heuristic)
			} else if(elem.part[elem.part.length - 1] === '}') {
				//closing curlyBrackets
				possibleSemi = updateSemi(possibleSemi, heuristic)
			} else if((elem.loc[1] - (heuristic.lastChar.loc[1] + heuristic.lastChar.part.length)) >= 1) {
				//large space
				possibleSemi = updateSemi(possibleSemi, heuristic)
			}

			//checking condishions for adding semicolons
			if((elem.part === '<-') || (elem.part === '->') || (elem.part === '<<-') || (elem.part === '->>')) {
			//check for assignments
				if(heuristic.assignment) {
					if(!heuristic.addedSemi) {
						code.push({ linePart: [ { part: ';', loc: possibleSemi } ], indent: 0 })
						heuristic.addedSemi = true
					}
				}
				heuristic.assignment = !heuristic.assignment
			} else if(elem.part[0] === '(') {
				//check for brackets
				heuristic.assignment = false
				if(heuristic.brackets) {
					if(!heuristic.addedSemi) {
						code.push({ linePart: [ { part: ';', loc: possibleSemi } ], indent: 0 })
						heuristic.addedSemi = true
					}
					heuristic.brackets = false
				}
			} else if(elem.part[0] === '{') {
				//check for curlyBrackets
				heuristic.assignment = false
				if(heuristic.curlyBrackets) {
					if(!heuristic.addedSemi) {
						code.push({ linePart: [ { part: ';', loc: possibleSemi } ], indent: 0 })
						heuristic.addedSemi = true
					}
					heuristic.curlyBrackets = false
				}
			} else if(!contains(specialChar, elem.part)) {
				//check for two consecutive statements
				if(heuristic.statement) {
					if(!heuristic.addedSemi) {
						code.push({ linePart: [ { part: ';', loc: possibleSemi } ], indent: 0 })
						heuristic.addedSemi = true
					}
				}
			}

			//update the last character seen
			heuristic.lastChar = elem
		}
	}
	code = merge(code)
	return code

	function updateSemi(possibleSemi: SourcePosition, heuristic: { assignment: boolean; brackets: boolean; lastChar: PrettyPrintLinePart; statement: boolean; addedSemi: boolean; curlyBrackets: boolean }) {
		const lastSemi: SourcePosition = [possibleSemi[0], possibleSemi[1]]
		const other: SourcePosition = [heuristic.lastChar.loc[0], heuristic.lastChar.loc[1] + heuristic.lastChar.part.length]
		possibleSemi = other
		heuristic.addedSemi = (lastSemi[0] === possibleSemi[0]) && (lastSemi[1] === possibleSemi[0])
		return possibleSemi
	}
}

export function prettyPrintCodeToString(code: Code, lf = '\n'): string {
	code = merge(code)
	code = addSemis(code)
	return code.map(({ linePart, indent }) => `${getIndentString(indent)}${prettyPrintPartToString(linePart, code[0].linePart[0].loc[1])}`).join(lf)
}

export function removeOuterExpressionListIfApplicable(result: PrettyPrintLine[]): Code {
	const first = result[0]?.linePart
	if(result.length === 1  && first[0].part === '{' && first[result[0].linePart.length - 1].part === '}') {
		// we are in a single line
		return [{ linePart: first.slice(1, first.length - 1), indent: result[0].indent }]
	} else if(result.length > 1 && first[0].part === '{' && result[result.length - 1].linePart[result[result.length - 1].linePart.length - 1].part === '}') {
		// remove outer block
		return indentBy(result.slice(1, result.length - 1), -1)
	} else {
		return result
	}
}

