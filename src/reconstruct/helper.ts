import type { NodeId, ParentInformation, RNode } from '../r-bridge'
import { RType } from '../r-bridge'
import type { SourcePosition } from '../util/range'
import type { ReconstructionConfiguration } from './reconstruct'

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
	let locationLine = location.line

	for(const line of split) {
		printLine.linePart.push({ part: line, loc: { column: location.column, line: locationLine++ } })
	}
	return [printLine]
}
export function plainSplit(text: string, location: SourcePosition): Code {
	const printLine: PrettyPrintLine = { linePart: [], indent: 0 }
	let i = 0
	let token = ''
	let currLoc = { line: location.line, column: location.column }
	while(i < text.length) {
		if(text[i] === ' ') {
			if(!(token === '')) {
				printLine.linePart.push({ part: token, loc: currLoc })
			}
			currLoc = { column: currLoc.column + token.length + 1, line: currLoc.line }
			token = ''
		} else if(text[i] === '\n') {
			printLine.linePart.push({ part: token, loc: currLoc })
			currLoc = { column: location.column, line: currLoc.line + 1 }
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
				const lineNumber = part.loc.line
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
		line.linePart.sort((a, b) => a.loc.column - b.loc.column)
		result.push(line)
	}

	return result
}

export function prettyPrintPartToString(line: PrettyPrintLinePart[],columnOffset: number): string {
	if(line.length === 0) {
		return ''
	}
	line.sort((a, b) => a.loc.column - b.loc.column)
	let result = ''
	for(const part of line) {
		const currLength = result.length + columnOffset
		//we have to 0 any negative values as they can happen???
		result += ' '.repeat(Math.max(part.loc.column - currLength, 0))
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
			currLine = linePart.loc.line
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
				const lastSemi = { line: possibleSemi.line, column: possibleSemi.column }
				const other = { line: heuristic.lastChar.loc.line , column: heuristic.lastChar.loc.column + heuristic.lastChar.part.length }
				possibleSemi = other
				heuristic.addedSemi = (lastSemi.line === possibleSemi.line) && (lastSemi.column === possibleSemi.column)
			} else if(elem.part[elem.part.length - 1] === '}') {
				//closing curlyBrackets
				const lastSemi = { line: possibleSemi.line, column: possibleSemi.column }
				const other = { line: heuristic.lastChar.loc.line , column: heuristic.lastChar.loc.column + heuristic.lastChar.part.length }
				possibleSemi = other
				heuristic.addedSemi = (lastSemi.line === possibleSemi.line) && (lastSemi.column === possibleSemi.column)
			} else if((elem.loc.column - (heuristic.lastChar.loc.column + heuristic.lastChar.part.length)) >= 1) {
				//large space
				const other = { line: heuristic.lastChar.loc.line , column: heuristic.lastChar.loc.column + heuristic.lastChar.part.length }
				const lastSemi = { line: possibleSemi.line, column: possibleSemi.column }
				possibleSemi = other
				heuristic.addedSemi = (lastSemi.line === possibleSemi.line) && (lastSemi.column === possibleSemi.column)
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
}

export function prettyPrintCodeToString(code: Code, lf = '\n'): string {
	code = merge(code)
	code = addSemis(code)
	return code.map(({ linePart, indent }) => `${getIndentString(indent)}${prettyPrintPartToString(linePart, code[0].linePart[0].loc.column)}`).join(lf)
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

