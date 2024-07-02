import type { GenericDifferenceInformation, WriteableDifferenceReport } from '../../util/diff'
import { setDifference } from '../../util/diff'
import type { IEnvironment, REnvironmentInformation } from './environment'
import { builtInEnvJsonReplacer } from './environment'
import { jsonReplacer } from '../../util/json'
import type { IdentifierReference } from './identifier'
import { diffControlDependencies } from '../info'
import { BuiltInMemory, EmptyBuiltInMemory } from './built-in'

export function diffIdentifierReferences<Report extends WriteableDifferenceReport>(a: IdentifierReference | undefined, b: IdentifierReference | undefined, info: GenericDifferenceInformation<Report>): void {
	if(a === undefined || b === undefined) {
		if(a !== b) {
			info.report.addComment(`${info.position}Different identifier references: ${info.leftname}: ${JSON.stringify(a, jsonReplacer)} vs. ${info.rightname}: ${JSON.stringify(b, jsonReplacer)}`)
		}
		return
	}
	if(a.name !== b.name) {
		info.report.addComment(`${info.position}Different identifier names: ${info.leftname}: ${a.name} vs. ${info.rightname}: ${b.name}`)
	}
	if(a.nodeId !== b.nodeId) {
		info.report.addComment(`${info.position}Different nodeIds: ${info.leftname}: ${a.nodeId} vs. ${info.rightname}: ${b.nodeId}`)
	}
	diffControlDependencies(a.controlDependencies, b.controlDependencies, info)
}

function diffMemory<Report extends WriteableDifferenceReport>(a: IEnvironment, b: IEnvironment, info: GenericDifferenceInformation<Report>) {
	for(const [key, value] of a.memory) {
		const value2 = b.memory.get(key)
		if(value2 === undefined || value.length !== value2.length) {
			info.report.addComment(`${info.position}Different definitions for ${key}. ${info.leftname}: ${JSON.stringify(value, jsonReplacer)} vs. ${info.rightname}: ${JSON.stringify(value2, jsonReplacer)}`)
			continue
		}

		// we sort both value arrays by their id so that we have no problems with differently ordered arrays (which have no impact)
		const sorted = [...value].sort((a, b) => String(a.nodeId).localeCompare(String(b.nodeId)))
		const sorted2 = [...value2].sort((a, b) => String(a.nodeId).localeCompare(String(b.nodeId)))

		for(let i = 0; i < value.length; ++i) {
			const aVal = sorted[i]
			const bVal = sorted2[i]
			if(aVal.name !== bVal.name) {
				info.report.addComment(`${info.position}Different names for ${key}. ${info.leftname}: ${aVal.name} vs. ${info.rightname}: ${bVal.name}`)
			}
			if(aVal.nodeId !== bVal.nodeId) {
				info.report.addComment(`${info.position}Different ids for ${key}. ${info.leftname}: ${aVal.nodeId} vs. ${info.rightname}: ${bVal.nodeId}`)
			}
			diffControlDependencies(aVal.controlDependencies, bVal.controlDependencies, { ...info, position: `${info.position} For ${key}. ` })
			if(aVal.definedAt !== bVal.definedAt) {
				info.report.addComment(`${info.position}Different definition ids (definedAt) for ${key} (${aVal.nodeId}). ${info.leftname}: ${aVal.definedAt} vs. ${info.rightname}: ${bVal.definedAt}`)
			}
			if(aVal.kind !== bVal.kind) {
				info.report.addComment(`${info.position}Different kinds for ${key} (${aVal.nodeId}). ${info.leftname}: ${aVal.kind} vs. ${info.rightname}: ${bVal.kind}`)
			}
		}
	}
}

export function diffEnvironment<Report extends WriteableDifferenceReport>(a: IEnvironment | undefined, b: IEnvironment | undefined, info: GenericDifferenceInformation<Report>, depth: number): void {
	if(a === undefined || b === undefined) {
		if(a !== b) {
			info.report.addComment(`${info.position}[at level: ${depth}] Different environments. ${info.leftname}: ${a !== undefined ? 'present' : 'undefined'} vs. ${info.rightname}: ${b !== undefined ? 'present' : 'undefined'}`)
		}
		return
	}
	if((a.memory === BuiltInMemory || a.memory === EmptyBuiltInMemory) &&
		(b.memory === BuiltInMemory || b.memory === EmptyBuiltInMemory)) {
		return
	}
	if(a.memory.size !== b.memory.size) {
		info.report.addComment(`${info.position}[at level: ${depth}] Different number of definitions in environment. ${info.leftname}: ${a.memory.size} vs. ${info.rightname}: ${b.memory.size}`)
		setDifference(new Set([...a.memory.keys()]), new Set([...b.memory.keys()]), {
			...info,
			position: `${info.position}[at level: ${depth}] Key comparison. `
		})
	}
	diffMemory(a, b, { ...info, position: `${info.position}[at level: ${depth}] ` })
	diffEnvironment(a.parent, b.parent, { ...info, position: `${info.position}Parents of ${a.id} & ${b.id}. ` }, depth--)
}

export function diffEnvironmentInformation<Report extends WriteableDifferenceReport>(a: REnvironmentInformation | undefined, b: REnvironmentInformation | undefined, info: GenericDifferenceInformation<Report>): void {
	if(a === undefined || b === undefined) {
		if(a !== b) {
			info.report.addComment(`${info.position}Different environments: ${JSON.stringify(a, builtInEnvJsonReplacer)} vs. ${JSON.stringify(b, builtInEnvJsonReplacer)}`)
		}
		return
	}
	if(a.level !== b.level) {
		info.report.addComment(`${info.position}Different environment levels: ${info.leftname}: ${a.level} vs. ${info.rightname}: ${b.level}. Using max to report level for further errors.`)
	}
	diffEnvironment(a.current, b.current, info, Math.max(a.level, b.level))
}
