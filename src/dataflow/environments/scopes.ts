export const GlobalScope = '.GlobalEnv'
export const LocalScope = 'local'

/**
 * Used to represent usual R scopes
 */
export type DataflowScopeName =
	| /** default R global environment */            typeof GlobalScope
	| /** unspecified automatic local environment */ typeof LocalScope
	| /** named environments */                      string
