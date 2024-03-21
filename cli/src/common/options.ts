import type { OptionDefinition } from 'command-line-usage'
import os from 'os'
import { date2string } from '@eagleoutice/flowr/util/time'
import { allFeatureNames } from '@eagleoutice/flowr-statistics'

/**
 * This interface describes options, that every script *must* provide.
 */
export interface CommonOptions {
	/** Enables the most verbose logging option available. */
	verbose: boolean
	/**
	 * Shows the respective help including usage examples,
	 * see {@link processCommandLineArgs} or {@link helpForOptions} for more information.
	 */
	help:    boolean
}

/**
 * This string contains a string representation of the loading time of this module.
 */
const StartTimeString = date2string(new Date())

export const benchmarkOptions: OptionDefinition[] = [
	{ name: 'verbose',      alias: 'v', type: Boolean, description: 'Run with verbose logging [do not use for the real benchmark as this affects the time measurements, but only to find errors]' },
	{ name: 'help',         alias: 'h', type: Boolean, description: 'Print this usage guide' },
	{ name: 'limit',        alias: 'l', type: Number,  description: 'Limit the number of files to process (if given, this will choose these files randomly and add the chosen names to the output' },
	{ name: 'runs', alias: 'r', type: Number, description: 'The amount of benchmark runs that should be done, out of which an average will be calculated' },
	{ name: 'input',        alias: 'i', type: String,  description: 'Pass a folder or file as src to read from', multiple: true, defaultOption: true, defaultValue: [], typeLabel: '{underline files/folders}' },
	{ name: 'parallel',     alias: 'p', type: String,  description: 'Number of parallel executors (defaults to {italic max(cpu.count-1, 1)})', defaultValue: Math.max(os.cpus().length - 1, 1), typeLabel: '{underline number}' },
	{ name: 'slice',        alias: 's', type: String,  description: 'Automatically slice for *all* variables (default) or *no* slicing and only parsing/dataflow construction', defaultValue: 'all', typeLabel: '{underline all/no}' },
	{ name: 'output',       alias: 'o', type: String,  description: `Directory to write all the measurements to in a per-file-basis (defaults to {italic benchmark-${StartTimeString}})`, defaultValue: `benchmark-${StartTimeString}`,  typeLabel: '{underline file}' }
]

export const benchmarkHelperOptions: OptionDefinition[] = [
	{ name: 'verbose',      alias: 'v', type: Boolean, description: 'Run with verbose logging [do not use for the real benchmark as this affects the time measurements, but only to find errors]' },
	{ name: 'help',         alias: 'h', type: Boolean, description: 'Print this usage guide' },
	{ name: 'input',        alias: 'i', type: String,  description: 'Pass a single file as src to read from', multiple: false, defaultOption: true, typeLabel: '{underline file}' },
	{ name: 'file-id', alias: 'd', type: Number, description: 'A numeric file id that can be used to match an input and run-num to a file' },
	{ name: 'run-num', alias: 'r', type: Number, description: 'The n-th time that the file with the given file-id is being benchmarked' },
	{ name: 'slice',        alias: 's', type: String,  description: 'Automatically slice for *all* variables (default) or *no* slicing and only parsing/dataflow construction', defaultValue: 'all', typeLabel: '{underline all/no}' },
	{ name: 'output',       alias: 'o', type: String,  description: 'File to write the measurements to (appends a single line in JSON format)',  typeLabel: '{underline file}' },
]

export const exportQuadsOptions: OptionDefinition[] = [
	{ name: 'verbose',      alias: 'v', type: Boolean, description: 'Run with verbose logging' },
	{ name: 'help',         alias: 'h', type: Boolean, description: 'Print this usage guide' },
	{ name: 'input',        alias: 'i', type: String,  description: 'Pass a folder or file as src to read from', multiple: true, defaultOption: true, defaultValue: [], typeLabel: '{underline files/folders}' },
	{ name: 'limit',        alias: 'l', type: Number,  description: 'Limit the number of files to process' },
	{ name: 'output',       alias: 'o', type: String,  description: 'File to write all the generated quads to (defaults to {italic out.quads})', typeLabel: '{underline file}' },
]

export const slicerOptions: OptionDefinition[] = [
	{ name: 'verbose',       alias: 'v', type: Boolean, description: 'Run with verbose logging' },
	{ name: 'help',          alias: 'h', type: Boolean, description: 'Print this usage guide' },
	{ name: 'input',         alias: 'i', type: String,  description: '(Required) Pass a single file to slice', multiple: false, defaultOption: true, typeLabel: '{underline files}' },
	{ name: 'input-is-text', alias: 'r', type: Boolean, description: 'Indicate, that the input is *not* a file, but R code to directly consume' },
	{ name: 'diff',          alias: 'd', type: Boolean, description: 'This requires ansi-output and only works if the api option is not set. It visualizes the slice as a diff.' },
	{ name: 'criterion',     alias: 'c', type: String,  description: '(Required) Slicing criterion either in the form {underline line:col} or {underline line@variable}, multiple can be separated by \'{bold ;}\'. If you do not want to slice but only process the file, pass an empty string.', multiple: false },
	{ name: 'stats',         alias: 's', type: Boolean, description: 'Print stats and write them to {italic <output>.stats} (runtimes etc.)', multiple: false },
	{ name: 'output',        alias: 'o', type: String,  description: 'File to write all the generated quads to (defaults to the commandline)', typeLabel: '{underline file}' },
	{ name: 'api',                      type: Boolean, description: 'Instead of human-readable output, dump a lot of json with the results of all intermediate steps.' },
]

const featureNameList = [...allFeatureNames].map(s => `"${s}"`).join(', ')
export const statisticOptions: OptionDefinition[] = [
	{ name: 'verbose',      alias: 'v', type: Boolean, description: 'Run with verbose logging' },
	{ name: 'help',         alias: 'h', type: Boolean, description: 'Print this usage guide' },
	{ name: 'limit',        alias: 'l', type: Number,  description: 'Limit the number of files to process' },
	{ name: 'input',        alias: 'i', type: String,  description: 'Pass a folder or file as src to read from', multiple: true, defaultOption: true, defaultValue: [], typeLabel: '{underline files/folders}' },
	{ name: 'output-dir',   alias: 'o', type: String,  description: 'Folder to write the output to', defaultValue: `${process.cwd()}/statistics-out/${date2string(new Date())}`, typeLabel: '{underline folder}' },
	{ name: 'dump-json',                type: Boolean, description: 'Write JSON output during the extraction', typeLabel: '{underline folder}' },
	{ name: 'no-ansi',                  type: Boolean, description: 'Disable ansi-escape-sequences in the output. Useful, if you want to redirect the output to a file.' },
	{ name: 'parallel',     alias: 'p', type: String,  description: 'Number of parallel executors (defaults to {italic max(cpu.count-1, 1)})', defaultValue: Math.max(os.cpus().length - 1, 1), typeLabel: '{underline number}' },
	{ name: 'features',                 type: String,  description: `Features to track, supported are "all" or ${featureNameList}`, multiple: true, defaultValue: 'all', typeLabel: '{underline names}' },
]

export const statisticHelperOptions: OptionDefinition[] = [
	{ name: 'verbose',      alias: 'v', type: Boolean, description: 'Run with verbose logging' },
	{ name: 'help',         alias: 'h', type: Boolean, description: 'Print this usage guide' },
	{ name: 'input',        alias: 'i', type: String,  description: 'Pass single file as src to read from', multiple: false, defaultOption: true, typeLabel: '{underline file}' },
	{ name: 'output-dir',   alias: 'o', type: String,  description: 'Folder to write the output to', typeLabel: '{underline folder}' },
	{ name: 'root-dir',                 type: String,  description: 'Root dir for the statistics files', defaultValue: '' },
	{ name: 'compress',                 type: Boolean, description: 'Compress the output folder to a single file', defaultValue: false },
	{ name: 'dump-json',                type: Boolean, description: 'Write JSON output during the extraction', typeLabel: '{underline folder}' },
	{ name: 'no-ansi',                  type: Boolean, description: 'Disable ansi-escape-sequences in the output. Useful, if you want to redirect the output to a file.' },
	{ name: 'features',                 type: String,  description: `Features to track, supported are "all" or ${featureNameList}`, multiple: true, defaultValue: 'all', typeLabel: '{underline names}' },
]

export const summarizerOptions: OptionDefinition[] = [
	{ name: 'verbose',       alias: 'v', type: Boolean, description: 'Run with verbose logging' },
	{ name: 'help',          alias: 'h', type: Boolean, description: 'Print this usage guide' },
	{ name: 'type',          alias: 't', type: String,  description: 'Manually specify if you want to post-process benchmark results, statistics, or compressed statistics (defaults to auto).', defaultValue: 'auto' },
	{ name: 'graph',         alias: 'g', type: Boolean, description: 'Produce data to be used for visualizing benchmarks over time' },
	{ name: 'categorize',                type: Boolean, description: 'Categorize the results (e.g., "test", "example", ...)', defaultValue: false },
	{ name: 'project-skip',              type: Number,  description: 'Skip the first n folders to find the location of projects', defaultValue: 0 },
	{ name: 'ultimate-only', alias: 'u', type: Boolean, description: 'Only perform the second summary-stage, with this, the input is used to find the summary-output.' },
	{ name: 'input',         alias: 'i', type: String,  description: 'The {italic output} produced by the benchmark, the statistics, ...', defaultOption: true, multiple: false, typeLabel: '{underline file.json/output}' },
	{ name: 'output',        alias: 'o', type: String,  description: 'Basename of the summaries (defaults to {italic <input>-summary})', typeLabel: '{underline file}' },
]
