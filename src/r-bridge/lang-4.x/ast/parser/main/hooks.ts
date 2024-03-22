import type { NamedJsonEntry, JsonEntry } from '../json/format'
import type {
	RNumber,
	NoInfo,
	RBinaryOp,
	RComment,
	RForLoop,
	RFunctionCall,
	RIfThenElse,
	RNode,
	RRepeatLoop,
	RString,
	RUnaryOp,
	RWhileLoop,
	RSymbol,
	RLogical,
	BinaryOperatorFlavor,
	RParameter,
	RFunctionDefinition,
	RArgument,
	UnaryOperatorFlavor,
	RBreak,
	RNext,
	RAccess,
	RLineDirective,
	RPipe
} from '../../model'
import type { RNa } from '../../../values'
import type { ParserData } from './data'
import type { DeepReadonly, DeepRequired } from 'ts-essentials'

/** Denotes that if you return `undefined`, the parser will automatically take the original arguments (unchanged) */
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- makes writing hooks easier
type AutoIfOmit<T> = T | undefined | void

/**
 * Hooks for every action the parser does. They can process the object before and after the actual parsing.
 *
 * There are two main hooks:
 * - **before:** can transform the inputs to the function and is called before construction of the normalized ast. However, it can be called after initial checks are performed.
 * - **after:** can transform the result of the function and is called after construction of the normalized ast.
 * 
 * Furthermore, for events that "try" to identify a structure, there is a third hook:
 * - **unknown:** is called if the structure could not be identified.
 *
 * For those marked with {@link AutoIfOmit} you can return `undefined` to automatically take the original arguments (unchanged).
 *
 * Use {@link executeHook} and {@link executeUnknownHook} to execute the hooks.
 *
 * Please note, that there is no guarantee, that a hook is not using any other. For example, {@link tryNormalizeIfThen} is used by {@link tryNormalizeIfThenElse}.
 */
export interface ParserHooks {
	values: {
		/** {@link normalizeNumber} */
		onNumber: {
			before(data: ParserData, inputObj: JsonEntry): AutoIfOmit<JsonEntry>
			after(data: ParserData, result: RNumber | RLogical | RSymbol<NoInfo, typeof RNa>): AutoIfOmit<RNumber | RLogical | RSymbol<NoInfo, typeof RNa>>
		},
		/** {@link parseString} */
		onString: {
			before(data: ParserData, inputObj: JsonEntry): AutoIfOmit<JsonEntry>
			after(data: ParserData, result: RString): AutoIfOmit<RString>
		},
		/** {@link tryNormalizeSymbol} */
		onSymbol: {
			/**
       * triggered if {@link tryNormalizeSymbol} could not determine the namespace and or symbol.
       * Can emit non-symbol values easily due to special symbols like `T`.
       */
			unknown(data: ParserData, inputObjs: NamedJsonEntry[]): AutoIfOmit<RSymbol | undefined>
			before(data: ParserData, inputObjs: NamedJsonEntry[]): AutoIfOmit<NamedJsonEntry[]>
			after(data: ParserData, result: RSymbol | undefined): AutoIfOmit<RSymbol | undefined>
		}
	},
	/** {@link tryNormalizeAccess} */
	onAccess: {
		/**
     * triggered if {@link tryNormalizeAccess} could not determine the access
     */
		unknown(data: ParserData, inputObjs: NamedJsonEntry[]): AutoIfOmit<RAccess | undefined>
		before(data: ParserData, inputObjs: NamedJsonEntry[]): AutoIfOmit<NamedJsonEntry[]>
		after(data: ParserData, result: RAccess): AutoIfOmit<RAccess>
	},
	other: {
		/** {@link normalizeComment} */
		onComment: {
			before(data: ParserData, inputObj: JsonEntry): AutoIfOmit<JsonEntry>
			after(data: ParserData, result: RComment): AutoIfOmit<RComment>
		}
		/** {@link normalizeLineDirective} */
		onLineDirective: {
			before(data: ParserData, inputObj: JsonEntry): AutoIfOmit<JsonEntry>
			after(data: ParserData, result: RLineDirective | RComment): AutoIfOmit<RLineDirective | RComment>
		}
	},
	operators: {
		/** {@link tryNormalizeBinary}, includes {@link RPipe} and {@link RFunctionCall} in case of special infix binary operations */
		onBinary: {
			/** triggered if {@link tryNormalizeBinary} could not find a matching operator, you probably still want to return `undefined` */
			unknown(data: ParserData, input: { lhs: NamedJsonEntry, operator: NamedJsonEntry, rhs: NamedJsonEntry }): AutoIfOmit<RNode | undefined>
			before(data: ParserData, input: { flavor: BinaryOperatorFlavor | 'special' | 'pipe', lhs: NamedJsonEntry, operator: NamedJsonEntry, rhs: NamedJsonEntry }): AutoIfOmit<{flavor: BinaryOperatorFlavor | 'special' | 'pipe', lhs: NamedJsonEntry, operator: NamedJsonEntry, rhs: NamedJsonEntry}>
			after(data: ParserData, result: RFunctionCall | RBinaryOp | RPipe): AutoIfOmit<RFunctionCall | RBinaryOp | RPipe>
		},
		/** {@link tryNormalizeUnary} */
		onUnary: {
			/** triggered if {@link tryNormalizeUnary} could not find a matching operator, you probably still want to return `undefined` */
			unknown(data: ParserData, input: { operator: NamedJsonEntry, operand: NamedJsonEntry } ): AutoIfOmit<RNode | undefined>
			before(data: ParserData, input: { flavor: UnaryOperatorFlavor, operator: NamedJsonEntry, operand: NamedJsonEntry }): AutoIfOmit<{flavor: UnaryOperatorFlavor, operator: NamedJsonEntry, operand: NamedJsonEntry}>
			after(data: ParserData, result: RUnaryOp): AutoIfOmit<RUnaryOp>
		},
	},
	loops: {
		/** {@link tryNormalizeFor} */
		onForLoop: {
			/** triggered if {@link tryNormalizeFor} could not detect a for-loop, you probably still want to return `undefined` */
			unknown(data: ParserData, input: { forToken: NamedJsonEntry, condition: NamedJsonEntry, body: NamedJsonEntry }): AutoIfOmit<RForLoop | undefined>
			before(data: ParserData, input: { forToken: NamedJsonEntry, condition: NamedJsonEntry, body: NamedJsonEntry }): AutoIfOmit<{ forToken: NamedJsonEntry, condition: NamedJsonEntry, body: NamedJsonEntry }>
			after(data: ParserData, result: RForLoop): AutoIfOmit<RForLoop>
		},
		/** {@link tryNormalizeRepeat} */
		onRepeatLoop: {
			/** triggered if {@link tryNormalizeRepeat} could not detect a repeat-loop, you probably still want to return `undefined` */
			unknown(data: ParserData, input: { repeatToken: NamedJsonEntry, body: NamedJsonEntry }): AutoIfOmit<RRepeatLoop | undefined>
			before(data: ParserData, input: { repeatToken: NamedJsonEntry, body: NamedJsonEntry }): AutoIfOmit<{ repeatToken: NamedJsonEntry, body: NamedJsonEntry }>
			after(data: ParserData, result: RRepeatLoop): AutoIfOmit<RRepeatLoop>
		},
		/** {@link tryNormalizeWhile} */
		onWhileLoop: {
			/** triggered if {@link tryNormalizeWhile} could not detect a while-loop, you probably still want to return `undefined` */
			unknown(data: ParserData, input: { whileToken: NamedJsonEntry, leftParen: NamedJsonEntry, condition: NamedJsonEntry, rightParen: NamedJsonEntry, body: NamedJsonEntry }): AutoIfOmit<RWhileLoop | undefined>
			before(data: ParserData, input: { whileToken: NamedJsonEntry, leftParen: NamedJsonEntry, condition: NamedJsonEntry, rightParen: NamedJsonEntry, body: NamedJsonEntry }): AutoIfOmit<{ whileToken: NamedJsonEntry, leftParen: NamedJsonEntry, condition: NamedJsonEntry, rightParen: NamedJsonEntry, body: NamedJsonEntry }>
			after(data: ParserData, result: RWhileLoop): AutoIfOmit<RWhileLoop>
		}
		/** {@link normalizeBreak} */
		onBreak: {
			before (data: ParserData, input: JsonEntry): AutoIfOmit<JsonEntry>
			after (data: ParserData, result: RBreak): AutoIfOmit<RBreak>
		},
		onNext: {
			before (data: ParserData, input: JsonEntry): AutoIfOmit<JsonEntry>
			after (data: ParserData, result: RNext): AutoIfOmit<RNext>
		}
	},
	functions: {
		/** {@link tryNormalizeFunctionDefinition} */
		onFunctionDefinition: {
			/** triggered if {@link tryNormalizeFunctionDefinition} could not detect a function definition, you probably still want to return `undefined` */
			unknown(data: ParserData, mappedWithName: NamedJsonEntry[]): AutoIfOmit<RFunctionDefinition | undefined>
			before(data: ParserData, mappedWithName: NamedJsonEntry[]): AutoIfOmit<NamedJsonEntry[]>
			after(data: ParserData, result: RFunctionDefinition): AutoIfOmit<RFunctionDefinition>
		}
		/** {@link tryNormalizeParameter} */
		onParameter: {
			/** triggered if {@link tryNormalizeParameter} could not detect a parameter, you probably still want to return `undefined` */
			unknown(data: ParserData, mappedWithName: NamedJsonEntry[]): AutoIfOmit<RParameter | undefined>
			before(data: ParserData, mappedWithName: NamedJsonEntry[]): AutoIfOmit<NamedJsonEntry[]>
			after(data: ParserData, result: RParameter): AutoIfOmit<RParameter>
		}
		/** {@link tryNormalizeFunctionCall} */
		onFunctionCall: {
			/** triggered if {@link tryNormalizeFunctionCall} could not detect a function call, you probably still want to return `undefined` */
			unknown(data: ParserData, mappedWithName: NamedJsonEntry[]): AutoIfOmit<RFunctionCall | RNext | RBreak | undefined>
			before(data: ParserData, mappedWithName: NamedJsonEntry[]): AutoIfOmit<NamedJsonEntry[]>
			after(data: ParserData, result: RFunctionCall | RNext | RBreak): AutoIfOmit<RFunctionCall | RNext | RBreak>
		}
		/** {@link tryToNormalizeArgument} */
		onArgument: {
			/** triggered if {@link tryToNormalizeArgument} could not detect an argument, you probably still want to return `undefined` */
			unknown(data: ParserData, mappedWithName: NamedJsonEntry[]): AutoIfOmit<RArgument | undefined>
			before(data: ParserData, mappedWithName: NamedJsonEntry[]): AutoIfOmit<NamedJsonEntry[]>
			after(data: ParserData, result: RArgument): AutoIfOmit<RArgument>
		}
	},
	expression: {
		/** {@link normalizeExpression} */
		onExpression: {
			/** *Warning:* can be a function call/definition as well, is not known when issuing before! */
			before(data: ParserData, inputObj: JsonEntry): AutoIfOmit<JsonEntry>
			after(data: ParserData, result: RNode): AutoIfOmit<RNode>
		}
	},
	control: {
		/** {@link tryNormalizeIfThen}, triggered by {@link onIfThenElse} as well */
		onIfThen: {
			/** triggered if {@link tryNormalizeIfThen} could not detect an if-then, you probably still want to return `undefined` */
			unknown(data: ParserData, tokens: [
        ifToken:    NamedJsonEntry,
        leftParen:  NamedJsonEntry,
        condition:  NamedJsonEntry,
        rightParen: NamedJsonEntry,
        then:       NamedJsonEntry
			]): AutoIfOmit<RIfThenElse | undefined>
			before(data: ParserData, tokens: [
        ifToken:    NamedJsonEntry,
        leftParen:  NamedJsonEntry,
        condition:  NamedJsonEntry,
        rightParen: NamedJsonEntry,
        then:       NamedJsonEntry
			]): AutoIfOmit<[
        ifToken:    NamedJsonEntry,
        leftParen:  NamedJsonEntry,
        condition:  NamedJsonEntry,
        rightParen: NamedJsonEntry,
        then:       NamedJsonEntry
			]>
			after(data: ParserData, result: RIfThenElse): AutoIfOmit<RIfThenElse>
		},
		/** {@link tryNormalizeIfThenElse}, triggers {@link onIfThen} */
		onIfThenElse: {
			/** triggered if {@link tryNormalizeIfThenElse} could not detect an if-then-else, you probably still want to return `undefined`, this is probably called as a consequence of the unknown hook of if-then */
			unknown(data: ParserData, tokens: [
        ifToken:    NamedJsonEntry,
        leftParen:  NamedJsonEntry,
        condition:  NamedJsonEntry,
        rightParen: NamedJsonEntry,
        then:       NamedJsonEntry,
        elseToken:  NamedJsonEntry,
        elseBlock:  NamedJsonEntry
			]): AutoIfOmit<RIfThenElse | undefined>
			/** be aware, that the if-then part triggers another hook! */
			before(data: ParserData, tokens: [
        ifToken:    NamedJsonEntry,
        leftParen:  NamedJsonEntry,
        condition:  NamedJsonEntry,
        rightParen: NamedJsonEntry,
        then:       NamedJsonEntry,
        elseToken:  NamedJsonEntry,
        elseBlock:  NamedJsonEntry
			]): AutoIfOmit<[
        ifToken:    NamedJsonEntry,
        leftParen:  NamedJsonEntry,
        condition:  NamedJsonEntry,
        rightParen: NamedJsonEntry,
        then:       NamedJsonEntry,
        elseToken:  NamedJsonEntry,
        elseBlock:  NamedJsonEntry
			]>
			after(data: ParserData, result: RIfThenElse): AutoIfOmit<RIfThenElse>
		}
	}
}

/* eslint-disable -- hooks are unsafe */
/**
 * simple (rather type-wise unsafe ^^) function you can use to execute hooks and deal with {@link AutoIfOmit}
 *
 * @see executeUnknownHook
 */
export function executeHook<T, R>(hook: (data: ParserData, input: T) => AutoIfOmit<R>, data: ParserData, input: T): R {
	const result = hook(data, input)
	if (result === undefined) {
		return input as unknown as R
	}
	return result
}

/**
 * @see executeHook
 */
export function executeUnknownHook<T, R>(hook: (data: ParserData, input: T) => AutoIfOmit<R>, data: ParserData, input: T): Exclude<AutoIfOmit<R>, void> {
  return hook(data, input) as Exclude<AutoIfOmit<R>, void>
}
/* eslint-enable */

const doNothing = () => undefined

export const DEFAULT_PARSER_HOOKS: DeepReadonly<DeepRequired<ParserHooks>> = {
	values: {
		onNumber: {
			before: doNothing,
			after:  doNothing
		},
		onString: {
			before: doNothing,
			after:  doNothing
		},
		onSymbol: {
			unknown: doNothing,
			before:  doNothing,
			after:   doNothing
		}
	},
	onAccess: {
		unknown: doNothing,
		before:  doNothing,
		after:   doNothing
	},
	other: {
		onComment: {
			before: doNothing,
			after:  doNothing
		},
		onLineDirective: {
			before: doNothing,
			after:  doNothing
		}
	},
	control: {
		onIfThen: {
			unknown: doNothing,
			before:  doNothing,
			after:   doNothing
		},
		onIfThenElse: {
			unknown: doNothing,
			before:  doNothing,
			after:   doNothing
		}
	},
	loops: {
		onForLoop: {
			unknown: doNothing,
			before:  doNothing,
			after:   doNothing
		},
		onRepeatLoop: {
			unknown: doNothing,
			before:  doNothing,
			after:   doNothing
		},
		onWhileLoop: {
			unknown: doNothing,
			before:  doNothing,
			after:   doNothing
		},
		onBreak: {
			before: doNothing,
			after:  doNothing
		},
		onNext: {
			before: doNothing,
			after:  doNothing
		}
	},
	operators: {
		onBinary: {
			unknown: doNothing,
			before:  doNothing,
			after:   doNothing
		},
		onUnary: {
			unknown: doNothing,
			before:  doNothing,
			after:   doNothing
		}
	},
	functions: {
		onFunctionDefinition: {
			unknown: doNothing,
			before:  doNothing,
			after:   doNothing
		},
		onParameter: {
			unknown: doNothing,
			before:  doNothing,
			after:   doNothing
		},
		onFunctionCall: {
			unknown: doNothing,
			before:  doNothing,
			after:   doNothing
		},
		onArgument: {
			unknown: doNothing,
			before:  doNothing,
			after:   doNothing
		},
	},
	expression: {
		onExpression: {
			before: doNothing,
			after:  doNothing
		}
	}
} as const
