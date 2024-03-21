import type { MergeableRecord } from '../../../../util/objects'
import { RawRType } from './type'

/**
 * Just a type-alias so that type declarations become more readable.
 *
 * @see OperatorDatabase
 */
type StringUsedInRCode = string;

/**
 * The arity of an operator.
 */
export const enum OperatorArity {
	Unary = 1,
	Binary = 2,
	Both = 3,
}

export type UnaryOperatorFlavor = 'arithmetic' | 'logical' | 'model formula';
export type BinaryOperatorFlavor =
  | UnaryOperatorFlavor
  | 'comparison'
  | 'assignment';
export type BinaryOperatorFlavorInAst = BinaryOperatorFlavor | 'special';
export type OperatorWrittenAs = 'infix' | 'prefix';
export type OperatorUsedAs = 'assignment' | 'operation' | 'access';
export type OperatorName = string;

export interface OperatorInformationValue extends MergeableRecord {
	name:                 OperatorName;
	stringUsedInRAst:     RawRType | `%${string}%`;
	stringUsedInternally: string;
	// precedence: number // handled by R
	flavorInRAst:         BinaryOperatorFlavorInAst;
	flavor:               BinaryOperatorFlavor;
	writtenAs:            OperatorWrittenAs;
	arity:                OperatorArity;
	usedAs:               OperatorUsedAs;
}

/* eslint-disable */
export const OperatorDatabase: Record<StringUsedInRCode, OperatorInformationValue> & MergeableRecord = {
  /* model formulae */
  '~':    { name: 'model formulae',               stringUsedInRAst: RawRType.Tilde,       stringUsedInternally: '~',    flavorInRAst: 'model formula', flavor: 'model formula', writtenAs: 'infix',  arity:  OperatorArity.Both,   usedAs: 'operation' },
  /* arithmetic */
  '+':    { name: 'addition or unary +',          stringUsedInRAst: RawRType.Plus,        stringUsedInternally: '+',    flavorInRAst: 'arithmetic',    flavor: 'arithmetic',    writtenAs: 'infix',  arity:  OperatorArity.Both,   usedAs: 'operation' },
  '-':    { name: 'subtraction or unary -',       stringUsedInRAst: RawRType.Minus,       stringUsedInternally: '-',    flavorInRAst: 'arithmetic',    flavor: 'arithmetic',    writtenAs: 'infix',  arity:  OperatorArity.Both,   usedAs: 'operation' },
  '*':    { name: 'multiplication',               stringUsedInRAst: RawRType.Times,       stringUsedInternally: '*',    flavorInRAst: 'arithmetic',    flavor: 'arithmetic',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '/':    { name: 'division',                     stringUsedInRAst: RawRType.Div,         stringUsedInternally: '/',    flavorInRAst: 'arithmetic',    flavor: 'arithmetic',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '^':    { name: 'exponentiation',               stringUsedInRAst: RawRType.Exp,         stringUsedInternally: '^',    flavorInRAst: 'arithmetic',    flavor: 'arithmetic',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  /* no error, R uses ^ to represent ** in the AST */
  '**':   { name: 'alternative exponentiation',   stringUsedInRAst: RawRType.Exp,         stringUsedInternally: '**',   flavorInRAst: 'arithmetic',    flavor: 'arithmetic',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '%%':   { name: 'modulus',                      stringUsedInRAst: '%%',                 stringUsedInternally: '%%',   flavorInRAst: 'special',       flavor: 'arithmetic',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '%/%':  { name: 'integer division',             stringUsedInRAst: '%/%',                stringUsedInternally: '%/%',  flavorInRAst: 'special',       flavor: 'arithmetic',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '%*%':  { name: 'matrix product',               stringUsedInRAst: '%*%',                stringUsedInternally: '%*%',  flavorInRAst: 'special',       flavor: 'arithmetic',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '%o%':  { name: 'outer product',                stringUsedInRAst: '%o%',                stringUsedInternally: '%o%',  flavorInRAst: 'special',       flavor: 'arithmetic',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '%x%':  { name: 'kronecker product',            stringUsedInRAst: '%x%',                stringUsedInternally: '%x%',  flavorInRAst: 'special',       flavor: 'arithmetic',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  /* comparison */
  '==':   { name: 'equal to',                     stringUsedInRAst: RawRType.Eq,          stringUsedInternally: '==',   flavorInRAst: 'comparison',    flavor: 'comparison',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '!=':   { name: 'not equal to',                 stringUsedInRAst: RawRType.Ne,          stringUsedInternally: '!=',   flavorInRAst: 'comparison',    flavor: 'comparison',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '>':    { name: 'greater than',                 stringUsedInRAst: RawRType.Gt,          stringUsedInternally: '>',    flavorInRAst: 'comparison',    flavor: 'comparison',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '>=':   { name: 'greater than or equal to',     stringUsedInRAst: RawRType.Ge,          stringUsedInternally: '>=',   flavorInRAst: 'comparison',    flavor: 'comparison',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '<':    { name: 'less than',                    stringUsedInRAst: RawRType.Lt,          stringUsedInternally: '<',    flavorInRAst: 'comparison',    flavor: 'comparison',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '<=':   { name: 'less than or equal to',        stringUsedInRAst: RawRType.Le,          stringUsedInternally: '<=',   flavorInRAst: 'comparison',    flavor: 'comparison',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  /* logical */
  '&':    { name: 'logical and (vectorized)',     stringUsedInRAst: RawRType.And,         stringUsedInternally: '&',    flavorInRAst: 'logical',       flavor: 'logical',       writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '&&':   { name: 'logical and (non-vectorized)', stringUsedInRAst: RawRType.And2,        stringUsedInternally: '&&',   flavorInRAst: 'logical',       flavor: 'logical',       writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '|':    { name: 'logical or (vectorized)',      stringUsedInRAst: RawRType.Or,          stringUsedInternally: '|',    flavorInRAst: 'logical',       flavor: 'logical',       writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '||':   { name: 'logical or (not-vectorized)',  stringUsedInRAst: RawRType.Or2,         stringUsedInternally: '||',   flavorInRAst: 'logical',       flavor: 'logical',       writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '!':    { name: 'unary not',                    stringUsedInRAst: RawRType.Exclamation, stringUsedInternally: '!',    flavorInRAst: 'logical',       flavor: 'logical',       writtenAs: 'prefix', arity:  OperatorArity.Unary,  usedAs: 'operation' },
  '%in%': { name: 'matching operator',            stringUsedInRAst: '%in%',               stringUsedInternally: '%in%', flavorInRAst: 'special',       flavor: 'logical',       writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  /* assignment */
  '<-':   { name: 'left assignment',              stringUsedInRAst: RawRType.LeftAssign,  stringUsedInternally: '<-',   flavorInRAst: 'special',       flavor: 'assignment',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'assignment' },
  ':=':   { name: 'left assignment',              stringUsedInRAst: RawRType.LeftAssign,  stringUsedInternally: ':=',   flavorInRAst: 'special',       flavor: 'assignment',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'assignment' },
  '<<-':  { name: 'left global assignment',       stringUsedInRAst: RawRType.LeftAssign,  stringUsedInternally: '<<-',  flavorInRAst: 'special',       flavor: 'assignment',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'assignment' },
  '->':   { name: 'right assignment',             stringUsedInRAst: RawRType.RightAssign, stringUsedInternally: '->',   flavorInRAst: 'special',       flavor: 'assignment',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'assignment' },
  '->>':  { name: 'right global assignment',      stringUsedInRAst: RawRType.RightAssign, stringUsedInternally: '->>',  flavorInRAst: 'special',       flavor: 'assignment',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'assignment' },
  '=':    { name: 'equal assignment',             stringUsedInRAst: RawRType.EqualAssign, stringUsedInternally: '=',    flavorInRAst: 'special',       flavor: 'assignment',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'assignment' },
  /* others */
  /* maybe introduce custom in-r-ast flavor for these? we consider it arithmetic, as it works on numbers => if we change this we have to create custom tests! (with arithmetic, there is the automatic test set) */
  ':':    { name: 'sequence operator',            stringUsedInRAst: RawRType.Colon,       stringUsedInternally: ':',    flavorInRAst: 'special',       flavor: 'arithmetic',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation' },
  '?':    { name: 'question',                     stringUsedInRAst: RawRType.Question,    stringUsedInternally: '?',    flavorInRAst: 'special',       flavor: 'logical',       writtenAs: 'prefix', arity:  OperatorArity.Unary,  usedAs: 'operation' }
}
/* eslint-enable */

function buildOperatorRAstCollection(operators: readonly string[]): Set<string> {
	return new Set<string>(operators.map(op => OperatorDatabase[op].stringUsedInRAst))
}

export const ArithmeticOperators: readonly string[] = Object.keys(
	OperatorDatabase
).filter((op) => OperatorDatabase[op].flavor === 'arithmetic')
// '**' will be treated as '^'
export const ArithmeticOperatorsRAst = buildOperatorRAstCollection(ArithmeticOperators)
export const ComparisonOperators: readonly string[] = Object.keys(
	OperatorDatabase
).filter((op) => OperatorDatabase[op].flavor === 'comparison')
export const ComparisonOperatorsRAst = buildOperatorRAstCollection(ComparisonOperators)
export const LogicalOperators: readonly string[] = Object.keys(
	OperatorDatabase
).filter((op) => OperatorDatabase[op].flavor === 'logical')
export const LogicalOperatorsRAst = buildOperatorRAstCollection(LogicalOperators)

export const ModelFormulaOperators: readonly string[] = Object.keys(
	OperatorDatabase
).filter((op) => OperatorDatabase[op].flavor === 'model formula')
export const ModelFormulaOperatorsRAst = buildOperatorRAstCollection(ModelFormulaOperators)

export const Assignments: readonly string[] = Object.keys(
	OperatorDatabase
).filter((op) => OperatorDatabase[op].flavor === 'assignment')
export const AssignmentsRAst = buildOperatorRAstCollection(Assignments)

export const Operators = [
	...ArithmeticOperators,
	...ComparisonOperators,
	...LogicalOperators,
] as const

export type Operator = (typeof Operators)[number];
