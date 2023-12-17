import { DeepReadonly } from 'ts-essentials'
import { XmlParserConfig } from '../common/config'

/**
 * Contains all information populated and present during parsing, normalizing, and desugaring of the R AST.
 * This is essentially the configuration used to obtain the XML source.
 */
export type NormalizeConfiguration = DeepReadonly<XmlParserConfig>