import { log } from '../util/log'

export const dataflowLogger = log.getSubLogger({ name: 'dataflow' })

export * from './graph'
export * from './extractor'
export * from './environments/environment'
export * from '../util/mermaid/dfg'
export { diffIdentifierReferences, diffEnvironmentInformation, diffEnvironment, cloneEnvironmentInformation } from './environments'
export { Identifier, IdentifierDefinition, IdentifierReference, BuiltInEnvironment, BuiltIn } from './environments'
