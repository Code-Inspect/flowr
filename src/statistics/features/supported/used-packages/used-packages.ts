import type { Feature, FeatureProcessorInput, Query } from '../../feature'
import * as xpath from 'xpath-ts2'
import type { EvalOptions } from 'xpath-ts2/src/parse-api'
import type { Writable } from 'ts-essentials'
import { postProcess } from './post-process'
import { appendStatisticsFile } from '../../../output/statistics-file'

export const initialUsedPackageInfos = {
	library:              0,
	require:              0,
	loadNamespace:        0,
	requireNamespace:     0,
	attachNamespace:      0,
	withinApply:          0,
	'::':                 0,
	':::':                0,
	/** just contains all occurrences where it is impossible to statically determine which package is loaded */
	'<loadedByVariable>': 0
}

export type UsedPackageInfo = Writable<typeof initialUsedPackageInfos>

// based on the extraction routine of lintr search for function calls which are not character-loads (we can not trace those...)
const withinApply: Query = xpath.parse(`
  //SYMBOL_FUNCTION_CALL[contains(.,"apply")]/../..
    //SYMBOL[text()='require' or text()='library' or text()='loadNamespace' or text()='requireNamespace' or text()='attachNamespace']
    /../..
`)

// horrible ways I found exploratively like loading within `sapply`
const libraryOrRequire: Query = xpath.parse(`
  //SYMBOL_FUNCTION_CALL[text() = $variable]
    /parent::expr
    /parent::expr[
      expr[2][STR_CONST]
      or (
        expr[2][SYMBOL]
        and not(
          SYMBOL_SUB[text() = 'character.only']
          /following-sibling::expr[1]
          /NUM_CONST[text() = 'TRUE' or text() = 'T']
        )
      )
    ]/OP-LEFT-PAREN[1]/following-sibling::expr[1][SYMBOL | STR_CONST]
`)

// there is no except in xpath 1.0?
const packageLoadedWithVariableLoadRequire: Query = xpath.parse(`
    //SYMBOL_FUNCTION_CALL[text() = 'library' or text() = 'require']
    /parent::expr
    /parent::expr[
        expr[2][SYMBOL]
        and (
          SYMBOL_SUB[text() = 'character.only']
          /following-sibling::expr[1]
          /NUM_CONST[text() = 'TRUE' or text() = 'T']
        )
    ]/OP-LEFT-PAREN[1]/following-sibling::expr[1][SYMBOL | STR_CONST]
`)

const packageLoadedWithVariableNamespaces: Query = xpath.parse(`
  //SYMBOL_FUNCTION_CALL[text() = 'loadNamespace' or text() = 'requireNamespace' or text() = 'attachNamespace']/../following-sibling::expr[1][SYMBOL]
`)

const queryForFunctionCall: Query = xpath.parse(`
  //SYMBOL_FUNCTION_CALL[text() = $variable]/../following-sibling::expr[1][STR_CONST]
`)

// otherwise, the parser seems to fail
const queryForNsAccess: Query = xpath.parse(`
  //NS_GET[text() = $variable]/../SYMBOL_PACKAGE[1]
  |
  //NS_GET_INT[text() = $variable]/../SYMBOL_PACKAGE[1]
`)

const queries: { types: readonly (keyof UsedPackageInfo)[], query: { select(options?: EvalOptions): Node[] } }[] = [
	{
		types: [ 'library', 'require' ],
		query: libraryOrRequire
	},
	{
		types: [ 'loadNamespace', 'requireNamespace', 'attachNamespace' ],
		query: queryForFunctionCall
	},
	{
		types: [ '::', ':::' ],
		query: queryForNsAccess
	}
]

export const usedPackages: Feature<UsedPackageInfo> = {
	name:        'Used Packages',
	description: 'All the packages used in the code',

	process(existing: UsedPackageInfo, input: FeatureProcessorInput): UsedPackageInfo {
		// we will unify in the end, so we can count, group etc. but we do not re-count multiple packages in the same file
		for(const q of queries) {
			for(const fn of q.types) {
				const nodes = q.query.select({ node: input.parsedRAst, variables: { variable: fn } })
				existing[fn] += nodes.length
				appendStatisticsFile(this.name, fn, nodes, input.filepath, true)
			}
		}

		const nodesForVariableLoad = [
			...packageLoadedWithVariableLoadRequire.select({ node: input.parsedRAst }),
			...packageLoadedWithVariableNamespaces.select({ node: input.parsedRAst })
		]
		existing['<loadedByVariable>'] += nodesForVariableLoad.length
		// should not be unique as variables may be repeated, and we have no idea
		appendStatisticsFile(this.name, '<loadedByVariable>', nodesForVariableLoad, input.filepath)

		const withinApplyNodes = withinApply.select({ node: input.parsedRAst })
		existing.withinApply += withinApplyNodes.length
		appendStatisticsFile(this.name, 'withinApply', withinApplyNodes, input.filepath)

		return existing
	},

	initialValue: initialUsedPackageInfos,
	postProcess:  postProcess
}

