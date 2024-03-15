import type { NodeId, NormalizedAst } from '../../r-bridge'
import type { SourceRange } from '../../util/range'
import { mergeRanges, rangeCompare, rangesOverlap } from '../../util/range'
import { isNotUndefined } from '../../util/assert'
import { ansiFormatter, ColorEffect, Colors, FontStyles } from '../../statistics'

function grayOut(): string {
	return ansiFormatter.getFormatString({ color: Colors.White, effect: ColorEffect.Foreground, style: FontStyles.Faint })
}

function mergeJointRangesInSorted(loc: { location: SourceRange; selected: boolean }[]) {
	return loc.reduce((acc, curr) => {
		if(rangesOverlap(acc[acc.length - 1].location, curr.location)) {
			return [
				...acc.slice(0, -1), {
					selected: curr.selected || acc[acc.length - 1].selected,
					location: mergeRanges(acc[acc.length - 1].location, curr.location)
				}]
		} else {
			return [...acc, curr]
		}
	}, [loc[0]])
}

function highlight(s: string, selected: boolean): string {
	const primary = ansiFormatter.format(s, { color: Colors.Yellow, effect: ColorEffect.Foreground,  style: FontStyles.Bold })
	return selected ? ansiFormatter.format(primary, { style: FontStyles.Underline }) : primary
}

export function sliceDiffAnsi(slice: Set<NodeId>, normalized: NormalizedAst, criteriaIds: Set<NodeId>, originalCode: string) {
	let importantLocations = Array.from(normalized.idMap.entries())
		.filter(([id, { location }]) => slice.has(id) && isNotUndefined(location))
		.map(([id, { location }]) => ({ selected: criteriaIds.has(id), location: location as SourceRange }) as const)

	if(importantLocations.length === 0) {
		return `${grayOut()}${originalCode}${ansiFormatter.reset()}`
	}

	// we sort all locations from back to front so that replacements do not screw up the indices
	importantLocations.sort((a, b) => -rangeCompare(a.location, b.location))

	// we need to merge all ranges that overlap, otherwise even reversed traversal can still crew us up
	importantLocations = mergeJointRangesInSorted(importantLocations)

	const lines = originalCode.split('\n')

	for(const { selected, location } of importantLocations) {
		const [sl, sc, , ec] = location
		const line = lines[sl - 1]
		lines[sl - 1] = `${line.substring(0, sc - 1)}${ansiFormatter.reset()}${highlight(line.substring(sc - 1, ec), selected)}${grayOut()}${line.substring(ec)}`
	}

	return `${grayOut()}${lines.join('\n')}${ansiFormatter.reset()}`
}
