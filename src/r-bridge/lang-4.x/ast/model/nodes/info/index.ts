/**
 * Other nodes are not part of the normal ast but shipped with the source information.
 * This way, elements which are uninteresting to us (like braces and parentheses) can be ignored safely for most operations,
 * but are still available and linked to the corresponding element.
 * Comments attached within a structure are also part of this.
 * <p>
 * In the future, they could be still integrated into the main ast.
 * @module
 */


import type { RNode } from '../../model'
import type { RDelimiter } from './r-delimiter'

export * from './r-delimiter'

export type OtherInfoNode = RNode | RDelimiter
