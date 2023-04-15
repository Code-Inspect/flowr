import { type MergeableRecord } from '../../../util/objects'

/**
 * Represents the types known by R (i.e., it may contain more or others than the ones we use)
 */
export enum Type {
  ExprList = 'exprlist',
  Expr = 'expr',
  Symbol = 'SYMBOL',
  Boolean = 'boolean', /* will be represented as a number in R */
  Number = 'NUM_CONST', // TODO: support negative numbers
  String = 'STR_CONST',
  Assignment = 'assignment',
  BinaryOp = 'binaryop'
}

export const ArithmeticOperators: readonly string[] = ['+', '-', '*', '/', '^', '%%', '%/%']
export const ComparisonOperators: readonly string[] = ['==', '!=', '<', '>', '<=', '>=']
export const LogicalOperators: readonly string[] = ['&', '&&', '|', '||', '!']

export const Operators = [...ArithmeticOperators, ...ComparisonOperators, ...LogicalOperators] as const
export type Operator = typeof Operators[number]

export interface Base extends MergeableRecord {
  type: Type
}

// TODO: deep readonly variant
interface WithChildren<Children extends Base> extends Base {
  children: Children[]
}

interface Leaf extends Base {

}

// xmlparsedata uses start and end only to break ties and calculates them on max col width approximation
interface Position {
  line: number
  column: number
}

export interface Range {
  start: Position
  end: Position
}

export function rangeFrom(line1: number | string, col1: number | string, line2: number | string, col2: number | string): Range {
  return {
    start: { line: Number(line1), column: Number(col1) },
    end: { line: Number(line2), column: Number(col2) }
  }
}

interface Location {
  location: Range
}

export interface RExprList extends WithChildren<RNode> {
  readonly type: Type.ExprList
}

export interface RSymbol<T extends string = string> extends Leaf, Location {
  readonly type: Type.Symbol
  content: T
}

export interface RNumber extends Leaf, Location {
  readonly type: Type.Number
  content: number
}

export interface RBoolean extends Leaf, Location {
  readonly type: Type.Boolean
  content: boolean
}

export interface RString extends Leaf, Location {
  readonly type: Type.String
  // from the R-language definition a string is either delimited by a pair of single or double quotes
  quotes: '"' | "'"
  content: string
}

export interface RAssignment extends Base, Location {
  readonly type: Type.Assignment
  op: '=' | '<-' | '<<-' | '->' | '->>'
  lhs: RSingleNode
  rhs: RSingleNode
}

export interface RBinaryOp extends Base, Location {
  readonly type: Type.BinaryOp
  // TODO: others?
  op: string
  lhs: RNode
  rhs: RNode
}

export type RConstant = RNumber | RString | RBoolean | RSymbol<'NULL' | 'NA'>

export type RSingleNode = RSymbol | RConstant | RBinaryOp | RAssignment
export type RNode = RExprList | RSingleNode

export const ALL_VALID_TYPES = Object.values(Type)
