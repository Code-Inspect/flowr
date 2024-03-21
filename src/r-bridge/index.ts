/**
 * The `r-bridge` module provides the interface to the R-backend.
 * It is responsible to retrieve the normalized version of an R-AST from the R-backend.
 *
 * Using a {@link RShell} connection, you can use the {@link retrieveAstFromRCode} function to retrieve the normalized AST.
 *
 * @module
 */
export * from './lang-4.x'
export * from './shell'
export * from './retriever'
