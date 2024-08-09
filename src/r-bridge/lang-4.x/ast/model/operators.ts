import type { MergeableRecord } from '../../../../util/objects'
import { RawRType } from './type'
import type { SupportedFlowrCapabilityId } from '../../../data/get'

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

export type OperatorWrittenAs = 'infix' | 'prefix';
export type OperatorUsedAs = 'assignment' | 'operation' | 'access';

export interface OperatorInformationValue extends MergeableRecord {
	name:                 string;
	stringUsedInRAst:     RawRType | `%${string}%`;
	stringUsedInternally: string;
	// precedence: number // handled by R
	writtenAs:            OperatorWrittenAs;
	arity:                OperatorArity;
	usedAs:               OperatorUsedAs;
	/** The capabilities this operator maps to using the new desugaring */
	capabilities:         readonly SupportedFlowrCapabilityId[];
}

/* eslint-disable */
export const OperatorDatabase: Record<StringUsedInRCode, OperatorInformationValue> & MergeableRecord = {
  /* model formulae */
  '~':    { name: 'model formulae',               stringUsedInRAst: RawRType.Tilde,       stringUsedInternally: '~',    writtenAs: 'infix',  arity:  OperatorArity.Both,   usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'model-formula', 'function-calls'] },
  /* arithmetic */
  '+':    { name: 'addition or unary +',          stringUsedInRAst: RawRType.Plus,        stringUsedInternally: '+',    writtenAs: 'infix',  arity:  OperatorArity.Both,   usedAs: 'operation', capabilities: ['function-calls'] },
  '-':    { name: 'subtraction or unary -',       stringUsedInRAst: RawRType.Minus,       stringUsedInternally: '-',    writtenAs: 'infix',  arity:  OperatorArity.Both,   usedAs: 'operation', capabilities: ['function-calls'] },
  '*':    { name: 'multiplication',               stringUsedInRAst: RawRType.Times,       stringUsedInternally: '*',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'function-calls'] },
  '/':    { name: 'division',                     stringUsedInRAst: RawRType.Div,         stringUsedInternally: '/',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'function-calls']  },
  '^':    { name: 'exponentiation',               stringUsedInRAst: RawRType.Exp,         stringUsedInternally: '^',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'function-calls']  },
  /* no error, R uses ^ to represent ** in the AST */
  '**':   { name: 'alternative exponentiation',   stringUsedInRAst: RawRType.Exp,         stringUsedInternally: '**',   writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'function-calls']  },
  '%%':   { name: 'modulus',                      stringUsedInRAst: '%%',                 stringUsedInternally: '%%',   writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'special-operator', 'function-calls']  },
  '%/%':  { name: 'integer division',             stringUsedInRAst: '%/%',                stringUsedInternally: '%/%',  writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'special-operator', 'function-calls']  },
  '%*%':  { name: 'matrix product',               stringUsedInRAst: '%*%',                stringUsedInternally: '%*%',  writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'special-operator', 'function-calls']  },
  '%o%':  { name: 'outer product',                stringUsedInRAst: '%o%',                stringUsedInternally: '%o%',  writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'special-operator', 'function-calls']  },
  '%x%':  { name: 'kronecker product',            stringUsedInRAst: '%x%',                stringUsedInternally: '%x%',  writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'special-operator', 'function-calls']  },
  /* comparison */
  '==':   { name: 'equal to',                     stringUsedInRAst: RawRType.Eq,          stringUsedInternally: '==',   writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'function-calls']  },
  '!=':   { name: 'not equal to',                 stringUsedInRAst: RawRType.Ne,          stringUsedInternally: '!=',   writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'function-calls']  },
  '>':    { name: 'greater than',                 stringUsedInRAst: RawRType.Gt,          stringUsedInternally: '>',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'function-calls']  },
  '>=':   { name: 'greater than or equal to',     stringUsedInRAst: RawRType.Ge,          stringUsedInternally: '>=',   writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'function-calls']  },
  '<':    { name: 'less than',                    stringUsedInRAst: RawRType.Lt,          stringUsedInternally: '<',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'function-calls']  },
  '<=':   { name: 'less than or equal to',        stringUsedInRAst: RawRType.Le,          stringUsedInternally: '<=',   writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'function-calls']  },
  /* logical */
  '&':    { name: 'logical and (vectorized)',     stringUsedInRAst: RawRType.And,         stringUsedInternally: '&',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'function-calls', 'non-strict-logical-operators']  },
  '&&':   { name: 'logical and (non-vectorized)', stringUsedInRAst: RawRType.And2,        stringUsedInternally: '&&',   writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'function-calls', 'non-strict-logical-operators']  },
  '|':    { name: 'logical or (vectorized)',      stringUsedInRAst: RawRType.Or,          stringUsedInternally: '|',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'function-calls', 'non-strict-logical-operators']  },
  '||':   { name: 'logical or (not-vectorized)',  stringUsedInRAst: RawRType.Or2,         stringUsedInternally: '||',   writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'function-calls', 'non-strict-logical-operators']  },
  '!':    { name: 'unary not',                    stringUsedInRAst: RawRType.Exclamation, stringUsedInternally: '!',    writtenAs: 'prefix', arity:  OperatorArity.Unary,  usedAs: 'operation', capabilities: ['unary-operator', 'function-calls']  },
  '%in%': { name: 'matching operator',            stringUsedInRAst: '%in%',               stringUsedInternally: '%in%', writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'special-operator', 'function-calls']  },
  /* assignment */
  '<-':   { name: 'left assignment',              stringUsedInRAst: RawRType.LeftAssign,  stringUsedInternally: '<-',   writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'assignment', capabilities: ['binary-operator', 'infix-calls', 'assignment-functions', 'local-left-assignment', 'function-calls']  },
  ':=':   { name: 'left assignment',              stringUsedInRAst: RawRType.LeftAssign,  stringUsedInternally: ':=',   writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'assignment', capabilities: ['binary-operator', 'infix-calls', 'assignment-functions', 'local-equal-assignment', 'function-calls']  },
  '<<-':  { name: 'left global assignment',       stringUsedInRAst: RawRType.LeftAssign,  stringUsedInternally: '<<-',  writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'assignment', capabilities: ['binary-operator', 'infix-calls', 'assignment-functions', 'super-left-assignment', 'function-calls']  },
  '->':   { name: 'right assignment',             stringUsedInRAst: RawRType.RightAssign, stringUsedInternally: '->',   writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'assignment', capabilities: ['binary-operator', 'infix-calls', 'assignment-functions', 'local-right-assignment', 'function-calls']  },
  '->>':  { name: 'right global assignment',      stringUsedInRAst: RawRType.RightAssign, stringUsedInternally: '->>',  writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'assignment', capabilities: ['binary-operator', 'infix-calls', 'assignment-functions', 'super-right-assignment', 'function-calls']  },
  '=':    { name: 'equal assignment',             stringUsedInRAst: RawRType.EqualAssign, stringUsedInternally: '=',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'assignment', capabilities: ['binary-operator', 'infix-calls', 'assignment-functions', 'local-equal-assignment', 'function-calls']  },
  /* others */
  /* maybe introduce custom in-r-ast flavor for these? we consider it arithmetic, as it works on numbers => if we change this we have to create custom tests! (with arithmetic, there is the automatic test set) */
  ':':    { name: 'sequence operator',            stringUsedInRAst: RawRType.Colon,       stringUsedInternally: ':',    writtenAs: 'infix',  arity:  OperatorArity.Binary, usedAs: 'operation', capabilities: ['binary-operator', 'infix-calls', 'function-calls'] },
  '?':    { name: 'question',                     stringUsedInRAst: RawRType.Question,    stringUsedInternally: '?',    writtenAs: 'prefix', arity:  OperatorArity.Unary,  usedAs: 'operation', capabilities: ['unary-operator', 'built-in-help'] }
}
/* eslint-enable */

function buildOperatorRAstCollection(operators: readonly string[]): Set<string> {
	return new Set<string>(operators.map(op => OperatorDatabase[op].stringUsedInRAst))
}

export const Operators: readonly string[] = Object.keys(OperatorDatabase)

// '**' will be treated as '^'
export const OperatorsInRAst = buildOperatorRAstCollection(Operators)
export const UnaryOperatorsInRAst = buildOperatorRAstCollection(Operators.filter(op => OperatorDatabase[op].arity !== OperatorArity.Binary))
