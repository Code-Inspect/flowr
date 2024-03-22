import type { DeepPartial } from 'ts-essentials'
import type { ParserHooks , ParserData } from '../main'
import { DEFAULT_PARSER_HOOKS } from '../main'
import { decorateAst, deterministicCountingIdGenerator } from '../../model'
import type { IdGenerator, NoInfo , NormalizedAst } from '../../model'
import { deepMergeObject } from '../../../../../util/objects'
import { prepareParsedData , convertPreparedParsedData } from './format'
import { parseRootObjToAst } from '../main/internal'
import { log } from '../../../../../util/log'

export const parseLog = log.getSubLogger({ name: 'ast-parser' })

export function normalize(jsonString: string, hooks?: DeepPartial<ParserHooks>, getId: IdGenerator<NoInfo> = deterministicCountingIdGenerator(0)): NormalizedAst {
	const hooksWithDefaults = deepMergeObject(DEFAULT_PARSER_HOOKS, hooks) as ParserHooks

	const data: ParserData = { hooks: hooksWithDefaults, currentRange: undefined, currentLexeme: undefined }
	const object = convertPreparedParsedData(prepareParsedData(jsonString))

	return decorateAst(parseRootObjToAst(data, object), getId)
}
