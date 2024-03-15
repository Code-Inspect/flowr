import type { GenericDifferenceInformation, WriteableDifferenceReport } from '../../util/diff'
import { setDifference } from '../../util/diff'
import type { IEnvironment, REnvironmentInformation } from './environment'
import { jsonReplacer } from '../../util/json'
import type { IdentifierReference } from './identifier'
import { arrayEqual } from '../../util/arrays'

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
	if(!arrayEqual(a.controlDependency, b.controlDependency)) {
		info.report.addComment(`${info.position}Different control dependency: ${info.leftname}: ${JSON.stringify(a.controlDependency)} vs. ${info.rightname}: ${JSON.stringify(b.controlDependency)}`)
	}
}

function diffMemory<Report extends WriteableDifferenceReport>(a: IEnvironment, b: IEnvironment, info: GenericDifferenceInformation<Report>) {
	for(const [key, value] of a.memory) {
		const value2 = b.memory.get(key)
		if(value2 === undefined || value.length !== value2.length) {
			info.report.addComment(`${info.position}Different definitions for ${key}. ${info.leftname}: ${JSON.stringify(value, jsonReplacer)} vs. ${info.rightname}: ${JSON.stringify(value2, jsonReplacer)}`)
			continue
		}

		// we sort both value arrays by their id so that we have no problems with differently ordered arrays (which have no impact)
		const sorted = [...value].sort((a, b) => a.nodeId.localeCompare(b.nodeId))
		const sorted2 = [...value2].sort((a, b) => a.nodeId.localeCompare(b.nodeId))

		for(let i = 0; i < value.length; ++i) {
			const aVal = sorted[i]
			const bVal = sorted2[i]
			if(aVal.name !== bVal.name) {
				info.report.addComment(`${info.position}Different names for ${key}. ${info.leftname}: ${aVal.name} vs. ${info.rightname}: ${bVal.name}`)
			}
			if(aVal.nodeId !== bVal.nodeId) {
				info.report.addComment(`${info.position}Different ids for ${key}. ${info.leftname}: ${aVal.nodeId} vs. ${info.rightname}: ${bVal.nodeId}`)
			}
			if(!arrayEqual(aVal.controlDependency, bVal.controlDependency)) {
				info.report.addComment(`${info.position}Different controlDependency for ${key} (${aVal.nodeId}). ${info.leftname}: ${JSON.stringify(aVal.controlDependency)} vs. ${info.rightname}: ${JSON.stringify(bVal.controlDependency)}`)
			}
			if(aVal.definedAt !== bVal.definedAt) {
				info.report.addComment(`${info.position}Different definition ids (definedAt) for ${key} (${aVal.nodeId}). ${info.leftname}: ${aVal.definedAt} vs. ${info.rightname}: ${bVal.definedAt}`)
			}
			if(aVal.kind !== bVal.kind) {
				info.report.addComment(`${info.position}Different kinds for ${key} (${aVal.nodeId}). ${info.leftname}: ${aVal.kind} vs. ${info.rightname}: ${bVal.kind}`)
			}
		}
	}
}

export function diffEnvironment<Report extends WriteableDifferenceReport>(a: IEnvironment | undefined, b: IEnvironment | undefined, info: GenericDifferenceInformation<Report>): void {
	if(a === undefined || b === undefined) {
		if(a !== b) {
			info.report.addComment(`${info.position}Different environments. ${info.leftname}: ${JSON.stringify(a, jsonReplacer)} vs. ${info.rightname}: ${JSON.stringify(b, jsonReplacer)}`)
		}
		return
	}
	if(a.name !== b.name) {
		info.report.addComment(`${info.position}Different environment names. ${info.leftname}: ${a.name}  vs. ${info.rightname}: ${b.name}`)
	}
	if(a.memory.size !== b.memory.size) {
		info.report.addComment(`${info.position}Different environment sizes. ${info.leftname}: ${JSON.stringify(a, jsonReplacer)} vs. ${info.rightname}: ${JSON.stringify(b, jsonReplacer)}`)
		setDifference(new Set([...a.memory.keys()]), new Set([...b.memory.keys()]), {
			...info,
			position: `${info.position}Key comparison. `
		})
	}
	diffMemory(a, b, info)
	diffEnvironment(a.parent, b.parent, { ...info, position: `${info.position}Parents of ${a.id} & ${b.id}. ` })
}

export function diffEnvironmentInformation<Report extends WriteableDifferenceReport>(a: REnvironmentInformation | undefined, b: REnvironmentInformation | undefined, info: GenericDifferenceInformation<Report>): void {
	if(a === undefined || b === undefined) {
		info.report.addComment(`${info.position}Different environments: ${JSON.stringify(a, jsonReplacer)} vs. ${JSON.stringify(b, jsonReplacer)}`)
		return
	}
	diffEnvironment(a.current, b.current, info)
}
