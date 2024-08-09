import type { IPipelineStep, PipelineStepName } from '../pipeline-step'
import { PipelineStepStage } from '../pipeline-step'
import { InvalidPipelineError } from './invalid-pipeline-error'
import type { Pipeline } from './pipeline'
import { jsonReplacer } from '../../../util/json'
import { partitionArray } from '../../../util/arrays'

/**
 * Given a set of {@link IPipelineStep|steps} with their dependencies, this function verifies all requirements of {@link createPipeline}.
 */
export function verifyAndBuildPipeline(steps: readonly IPipelineStep[]): Pipeline {
	if(steps.length === 0) {
		throw new InvalidPipelineError('0) Pipeline is empty')
	}

	const [perFileSteps, perRequestSteps] = partitionArray(steps, s => s.executed === PipelineStepStage.OncePerFile)

	// we construct a map linking each name to its respective step
	const perFileStepMap = new Map<PipelineStepName, IPipelineStep>()
	const initsPerFile: PipelineStepName[] = []
	const visited = new Set<PipelineStepName>()

	// we start by working on the per-file steps
	initializeSteps(perFileSteps, perFileStepMap, initsPerFile, visited)
	// first, we sort the per-file steps
	const sortedPerFile = topologicalSort(initsPerFile, perFileStepMap, visited)
	validateStepOutput(sortedPerFile, perFileStepMap, steps)

	const perRequestStepMap = new Map<PipelineStepName, IPipelineStep>(perFileStepMap)
	// we track all elements without dependencies, i.e., those that start the pipeline
	const initsPerRequest: PipelineStepName[] = []

	// now, we do the same for the per-request steps, keeping the per-file steps known
	initializeSteps(perRequestSteps, perRequestStepMap, initsPerRequest, visited)

	const sortedPerRequest = topologicalSort(initsPerRequest, perRequestStepMap, visited)
	const sorted = [...sortedPerFile, ...sortedPerRequest]
	validateStepOutput(sorted, perRequestStepMap, steps)

	return {
		steps:               perRequestStepMap,
		order:               sorted,
		firstStepPerRequest: sortedPerFile.length
	}
}

function validateStepOutput(sorted: PipelineStepName[], stepMap: Map<PipelineStepName, IPipelineStep>, steps: readonly IPipelineStep[]) {
	if(sorted.length !== stepMap.size) {
		// check if any of the dependencies in the map are invalid
		checkForInvalidDependency(steps, stepMap)
		// otherwise, we assume a cycle
		throw new InvalidPipelineError(`3) Pipeline contains at least one cycle; sorted: ${JSON.stringify(sorted)}, steps: ${JSON.stringify([...stepMap.keys()])}`)
	}
}

function allDependenciesAreVisited(step: IPipelineStep, visited: ReadonlySet<PipelineStepName>) {
	return step.dependencies.every(d => visited.has(d))
}

function handleStep(step: IPipelineStep, init: PipelineStepName, visited: Set<PipelineStepName>, sorted: PipelineStepName[], elem: PipelineStepName, decoratorsOfLastOthers: Set<PipelineStepName>, inits: PipelineStepName[]) {
	if(step.decorates === init) {
		if(allDependenciesAreVisited(step, visited)) {
			sorted.push(elem)
			visited.add(elem)
		} else {
			decoratorsOfLastOthers.add(elem)
		}
	} else if(step.decorates === undefined && allDependenciesAreVisited(step, visited)) {
		inits.push(elem)
	}
}

function topologicalSort(inits: PipelineStepName[], stepMap: Map<PipelineStepName, IPipelineStep>, visited: Set<PipelineStepName>) {
	const sorted: PipelineStepName[] = []

	while(inits.length > 0) {
		const init = inits.pop() as PipelineStepName
		sorted.push(init)
		visited.add(init)

		// these decorators still have dependencies open; we have to check if they can be satisfied by the other steps to add
		const decoratorsOfLastOthers = new Set<PipelineStepName>()
		for(const [elem, step] of stepMap.entries()) {
			if(visited.has(elem)) {
				continue
			}
			handleStep(step, init, visited, sorted, elem, decoratorsOfLastOthers, inits)
		}

		// for the other decorators we have to cycle until we find a solution, or know, that no solution exists
		topologicallyInsertDecoratorElements(decoratorsOfLastOthers, stepMap, visited, sorted)
	}
	return sorted
}

function topologicallyInsertDecoratorElements(decoratorsOfLastOthers: Set<PipelineStepName>, stepMap: Map<PipelineStepName, IPipelineStep>, visited: Set<PipelineStepName>, sorted: PipelineStepName[]) {
	if(decoratorsOfLastOthers.size === 0) {
		return
	}

	let changed = true
	while(changed) {
		changed = false
		for(const elem of [...decoratorsOfLastOthers]) {
			const step = stepMap.get(elem) as IPipelineStep
			if(allDependenciesAreVisited(step, visited)) {
				decoratorsOfLastOthers.delete(elem)
				sorted.push(elem)
				visited.add(elem)
				changed = true
			}
		}
	}
	if(decoratorsOfLastOthers.size > 0) {
		throw new InvalidPipelineError(`5) Pipeline contains at least one decoration cycle: ${JSON.stringify(decoratorsOfLastOthers, jsonReplacer)}`)
	}
}

function checkForInvalidDependency(steps: readonly IPipelineStep[], stepMap: Map<PipelineStepName, IPipelineStep>) {
	for(const step of steps) {
		for(const dep of step.dependencies) {
			if(!stepMap.has(dep)) {
				throw new InvalidPipelineError(`2) Step "${step.name}" depends on step "${dep}" which does not exist`)
			}
		}
		if(step.decorates && !stepMap.has(step.decorates)) {
			throw new InvalidPipelineError(`4) Step "${step.name}" decorates step "${step.decorates}" which does not exist`)
		}
	}
}

function initializeSteps(steps: readonly IPipelineStep[], stepMap: Map<PipelineStepName, IPipelineStep>, inits: PipelineStepName[], visited: ReadonlySet<PipelineStepName>) {
	for(const step of steps) {
		const name = step.name
		// if the name is already in the map, we have a duplicate
		if(stepMap.has(name)) {
			throw new InvalidPipelineError(`1) Step name "${name}" is not unique in the pipeline`)
		}
		stepMap.set(name, step)
		// only steps that have no dependencies and do not decorate others can be initial steps
		if(allDependenciesAreVisited(step, visited) && (step.decorates === undefined || visited.has(step.decorates))) {
			inits.push(name)
		}
	}
}

