import { OptionDefinition } from 'command-line-usage'
import os from 'os'
import { date2string } from '../../util/time'
import { allFeatureNames } from '../../statistics'

export interface CommonOptions {
	verbose: boolean
	help:    boolean
}


const now = date2string(new Date())

export const benchmarkOptions: OptionDefinition[] = [
	{ name: 'verbose',      alias: 'v', type: Boolean, description: 'Run with verbose logging [do not use for the real benchmark as this affects the time measurements, but only to find errors]' },
	{ name: 'help',         alias: 'h', type: Boolean, description: 'Print this usage guide' },
	{ name: 'limit',        alias: 'l', type: Number,  description: 'Limit the number of files to process (if given, this will choose these files randomly and add the chosen names to the output'},
	{ name: 'input',        alias: 'i', type: String,  description: 'Pass a folder or file as src to read from', multiple: true, defaultOption: true, defaultValue: [], typeLabel: '{underline files/folders}' },
	{ name: 'parallel',     alias: 'p', type: String,  description: 'Number of parallel executors (defaults to {italic max(cpu.count-1, 1)})', defaultValue: Math.max(os.cpus().length - 1, 1), typeLabel: '{underline number}' },
	{ name: 'slice',        alias: 's', type: String,  description: 'Automatically slice for *all* variables (default) or *no* slicing and only parsing/dataflow construction', defaultValue: 'all', typeLabel: '{underline all/no}' },
	{ name: 'output',       alias: 'o', type: String,  description: `File to write all the measurements to in a per-file-basis (defaults to {italic benchmark-${now}.json})`, defaultValue: `benchmark-${now}.json`,  typeLabel: '{underline file}' }
]

export const benchmarkHelperOptions: OptionDefinition[] = [
	{ name: 'verbose',      alias: 'v', type: Boolean, description: 'Run with verbose logging [do not use for the real benchmark as this affects the time measurements, but only to find errors]' },
	{ name: 'help',         alias: 'h', type: Boolean, description: 'Print this usage guide' },
	{ name: 'input',        alias: 'i', type: String,  description: 'Pass a single file as src to read from', multiple: false, defaultOption: true, typeLabel: '{underline file}' },
	{ name: 'slice',        alias: 's', type: String,  description: 'Automatically slice for *all* variables (default) or *no* slicing and only parsing/dataflow construction', defaultValue: 'all', typeLabel: '{underline all/no}' },
	{ name: 'output',       alias: 'o', type: String,  description: `File to write the measurements to (appends a single line in JSON format)`,  typeLabel: '{underline file}' },
]

export const exportQuadsOptions: OptionDefinition[] = [
	{ name: 'verbose',      alias: 'v', type: Boolean, description: 'Run with verbose logging' },
	{ name: 'help',         alias: 'h', type: Boolean, description: 'Print this usage guide' },
	{ name: 'input',        alias: 'i', type: String,  description: 'Pass a folder or file as src to read from', multiple: true, defaultOption: true, defaultValue: [], typeLabel: '{underline files/folders}' },
	{ name: 'limit',        alias: 'l', type: Number,  description: 'Limit the number of files to process'},
	{ name: 'output',       alias: 'o', type: String,  description: 'File to write all the generated quads to (defaults to {italic out.quads})', typeLabel: '{underline file}' },
]

export const slicerOptions: OptionDefinition[] = [
	{ name: 'verbose',      alias: 'v', type: Boolean, description: 'Run with verbose logging' },
	{ name: 'help',         alias: 'h', type: Boolean, description: 'Print this usage guide' },
	{ name: 'input',        alias: 'i', type: String,  description: '(Required) Pass a single file to slice', multiple: false, defaultOption: true, typeLabel: '{underline files}' },
	{ name: 'criterion',    alias: 'c', type: String,  description: '(Required) Slicing criterion either in the form {underline line:col} or {underline line@variable}, multiple can be separated by \'{bold ;}\'', multiple: false },
	{ name: 'stats',        alias: 's', type: Boolean, description: `Print stats and write them to {italic <output>.stats} (runtimes etc.)`, multiple: false },
	// { name: 'dataflow',     alias: 'd', type: Boolean, description: `Dump mermaid code for the dataflow to {italic <output>.dataflow}`, multiple: false },
	{ name: 'output',       alias: 'o', type: String,  description: 'File to write all the generated quads to (defaults to the commandline)', typeLabel: '{underline file}' },
]


const featureNameList = [...allFeatureNames].map(s => `"${s}"`).join(', ')
export const statisticOptions: OptionDefinition[] = [
	{ name: 'verbose',      alias: 'v', type: Boolean, description: 'Run with verbose logging' },
	{ name: 'help',         alias: 'h', type: Boolean, description: 'Print this usage guide' },
	{ name: 'post-process',             type: Boolean, description: 'If set, will enable post-processing of the given input (clustering, ...). Pass the output-dir of the processing as input.' },
	{ name: 'limit',        alias: 'l', type: Number,  description: 'Limit the number of files to process'},
	{ name: 'hist-step',                type: Number,  description: 'When post-processing, the step size for the histogram', defaultValue: 0.01, typeLabel: '{underline number}' },
	{ name: 'input',        alias: 'i', type: String,  description: 'Pass a folder or file as src to read from', multiple: true, defaultOption: true, defaultValue: [], typeLabel: '{underline files/folders}' },
	{ name: 'output-dir',   alias: 'o', type: String,  description: 'Folder to write the output to', defaultValue: `${process.cwd()}/statistics-out/${date2string(new Date())}`, typeLabel: '{underline folder}' },
	{ name: 'no-ansi',                  type: Boolean, description: 'Disable ansi-escape-sequences in the output. Useful, if you want to redirect the output to a file.'},
	{ name: 'features',                 type: String,  description: `Features to track, supported are "all" or ${featureNameList}`, multiple: true, defaultValue: 'all', typeLabel: `{underline names}` },
]

export const summarizerOptions: OptionDefinition[] = [
	{ name: 'verbose',       alias: 'v', type: Boolean, description: 'Run with verbose logging' },
	{ name: 'help',          alias: 'h', type: Boolean, description: 'Print this usage guide' },
	{ name: 'ultimate-only', alias: 'u', type: Boolean, description: 'Only perform the second summary-stage, with this, the input is used to find the summary-output.' },
	{ name: 'input',         alias: 'i', type: String,  description: 'The {italic output.json} produced by the benchmark tool', defaultOption: true, multiple: false, typeLabel: '{underline file.json}' },
	{ name: 'output',        alias: 'o', type: String,  description: `Basename of the summaries (defaults to {italic <input>-summary})`, typeLabel: '{underline file}' },
]
