/**
 * This file contains the references to all scripts, as well as their explanations and arguments.
 *
 * @module
 */
import type { MergeableRecord } from '@eagleoutice/flowr/util/objects'
import type { OptionDefinition } from 'command-line-usage'
import {
	benchmarkHelperOptions,
	benchmarkOptions,
	exportQuadsOptions,
	slicerOptions, statisticHelperOptions, statisticOptions,
	summarizerOptions
} from './options'
import { asOptionName } from '../repl/commands'


interface BaseScriptInformation extends MergeableRecord {
	toolName:     string
	target:       string
	description:  string
	usageExample: string
	options:      OptionDefinition[]
}

export interface MasterScriptInformation extends BaseScriptInformation {
	type: 'master script',
}

export interface HelperScriptInformation extends BaseScriptInformation {
	type:          'helper script',
	masterScripts: string[]
}

export type ScriptInformation = MasterScriptInformation | HelperScriptInformation

/**
 * We hold `_scripts` internally, as the modifiable variant and export the readonly scripts
 */
const _scripts = {
	'slicer': {
		toolName:     'slicer',
		target:       'slicer-app',
		description:  'Static backwards executable slicer for R',
		options:      slicerOptions,
		usageExample: 'slicer -c "12@product" test/testfiles/example.R',
		type:         'master script',
	},
	'benchmark': {
		toolName:     'benchmark',
		target:       'benchmark-app',
		description:  'Benchmark the static backwards slicer',
		type:         'master script',
		usageExample: 'benchmark "example-folder/"',
		options:      benchmarkOptions
	},
	'benchmark-helper': {
		toolName:      'benchmark-single',
		target:        'benchmark-helper-app',
		description:   'Helper Script to Benchmark the Slicer',
		usageExample:  'benchmark-single "example.R" --output "example.json"',
		options:       benchmarkHelperOptions,
		type:          'helper script',
		masterScripts: [ 'benchmark' ]
	},
	'summarizer': {
		toolName:     'summarizer',
		target:       'summarizer-app',
		description:  'Summarize the results of the benchmark',
		options:      summarizerOptions,
		usageExample: 'summarizer "benchmark.json"',
		type:         'master script',
	},
	'export-quads': {
		toolName:     'export-quads',
		target:       'export-quads-app',
		description:  'Export quads of the normalized AST of a given R code file',
		usageExample: 'export-quads "example.R" --output "example.quads"',
		options:      exportQuadsOptions,
		type:         'master script',
	},
	'stats': {
		toolName:     'stats',
		target:       'statistics-app',
		description:  'Generate usage Statistics for R scripts',
		options:      statisticOptions,
		usageExample: 'stats -i example.R --output-dir "output-folder/"',
		type:         'master script',
	},
	'stats-helper': {
		toolName:      'stats-helper',
		target:        'statistics-helper-app',
		description:   'Generate usage Statistics for a single R script (parallel helper for stats)',
		options:       statisticHelperOptions,
		usageExample:  'stats-helper -i example.R --output-dir "output-folder/"',
		type:          'helper script',
		masterScripts: [ 'stats' ]
	}
}

export const scripts = _scripts as Record<keyof typeof _scripts, ScriptInformation>

export function getValidOptionsForCompletion(options: readonly OptionDefinition[], prevArgs: readonly string[]): string[] {
	return options.filter(o => canAddOption(o, prevArgs)).flatMap(o => {
		const args = [asOptionName(o.name)]
		if(o.alias) {
			args.push(asOptionName(o.alias))
		}
		return args
	})
}

function canAddOption(option: OptionDefinition, prevArgs: readonly string[]): boolean {
	return option.multiple || !prevArgs.includes(asOptionName(option.name)) && (!option.alias || !prevArgs.includes(asOptionName(option.alias)))
}
