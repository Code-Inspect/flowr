***This wiki page is currently under construction (currently, references to the capabilities are missing)***

Based on the collection of tokens that we know can be emitted by R, this page is almost a verbatim copy of the corresponding section of the appendix in my [master's thesis](http://dx.doi.org/10.18725/OPARU-50107).

Every R&nbsp;program is an expression list, identified by the `exprlist` token type, which consists of several expressions (identified by `expr`).
Consider the following example:

```R
x <- 1 + 2
if(x > 0) {
    print("Hello World!")
}
y <- 3
```

The corresponding *expression list* consists of three expressions, namely the assignment of&nbsp;`1 + 2` to&nbsp;`x`, the&nbsp;`if` construct, and the assignment of&nbsp;`3` to&nbsp;`y`.

With the following tables, we provide what is to our knowledge a full list of token types that R&nbsp;produces.
For more information, the ["Syntax" topic](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/Syntax) of the R&nbsp;documentation offers a great starting point.

<!-- TOC -->
- [Tokens Representing Constants](#tokens-representing-constants)
- [Tokens Representing Assignments](#tokens-representing-assignments)
- [Tokens Representing Operators (No Assignments)](#tokens-representing-operators-no-assignments)
- [Tokens Representing Control-Flow Structures](#tokens-representing-control-flow-structures)
- [Tokens Indicating a Function Definition](#tokens-indicating-a-function-definition)
- [Tokens Used to Access Objects](#tokens-used-to-access-objects)
- [Tokens Representing Names](#tokens-representing-names)
- [Tokens Representing Comments or Directives](#tokens-representing-comments-or-directives)
- [Tokens Used To Delimit Parts of Expressions](#tokens-used-to-delimit-parts-of-expressions)
- [Tokens Representing Meta-Elements](#tokens-representing-meta-elements)
<!-- TOC -->

Besides `PIPEBIND`, which at the moment must be enabled explicitly by setting an [environment variable](https://github.com/REditorSupport/languageserver/issues/432) all the tokens shown in the tables are supported by the normalization of *flowR* - although this is different from supporting all of their uses.

It should be noted that there are many tokens that appear in the source code of the R&nbsp;interpreter but are not listed within the tables.
While some of these tokens, like `COLON_ASSIGN`, are explicitly marked as deprecated, several of them seem to be for internal use only and are - to the best of our knowledge - never emitted by the parser with [`getParseData`](https://www.rdocumentation.org/packages/utils/versions/3.6.2/topics/getParseData). For example:

- newlines are directly consumed to split expressions,
- error tokens produce an explicit error message, and
- the individual tokens for unary operators (like `UPLUS`) are transformed to the same token as their binary counterparts (like&nbsp;`+`).

## Tokens Representing Constants

| #  | ✓ | Token        | Description                                                                 |
|:---|:-:|:-------------|:----------------------------------------------------------------------------|
| T1 | ✓ | `NULL_CONST` | Represents *NULL*.                                                          |
| T2 | ✓ | `NUM_CONST`  | Identifies a number (including *NA*) or a logical, depending on the lexeme. |
| T3 | ✓ | `STR_CONST`  | A string, independent of the quotation mark.                                |

## Tokens Representing Assignments

| #  | ✓ | Token          | Description                                                                                           |
|:---|:-:|:---------------|:------------------------------------------------------------------------------------------------------|
| T4 | ✓ | `EQ_ASSIGN`    | A local equal assignment. Differentiate this from `EQ-SUB`, which has a slightly different semantic.  |
| T5 | ✓ | `EQ_FORMALS`   | Essentially `EQ-ASSIGN`, but when used within formals.                                                |
| T6 | ✓ | `EQ_SUB`       | Essentially `EQ-ASSIGN`, but when used to name arguments for function call or arguments in access.    |
| T7 | ✓ | `LEFT_ASSIGN`  | A local left assignment or global left assignment. Includes `:=`, originally bound to `COLON_ASSIGN`. |
| T8 | ✓ | `RIGHT_ASSIGN` | A local right assignment or global right assignment.                                                  |

## Tokens Representing Operators (No Assignments)

| #   | ✓ | Token      | Description                                                       |
|:----|:-:|:-----------|:------------------------------------------------------------------|
| T9  | ✓ | `AND`      | The vectorized logical and binary operator (`&`).                 |
| T10 | ✓ | `AND2`     | Non-vectorized logical and binary operator (`&&`).                |
| T11 | ✓ | `EQ`       | The equality binary operator.                                     |
| T12 | ✓ | `GE`       | Vectorized binary operator greater-than-or-equal-to.              |
| T13 | ✓ | `GT`       | Vectorized binary operator greater-than.                          |
| T14 | ✓ | `LE`       | Vectorized binary operator less-than-or-equal-to.                 |
| T15 | ✓ | `LT`       | Vectorized binary operator less-than.                             |
| T16 | ✓ | `NE`       | The inequality binary operator.                                   |
| T17 | ✓ | `OR`       | The vectorized logical or binary operator (`\|`).                 |
| T18 | ✓ | `OR2`      | Non-vectorized logical or binary operator (`\|\|`).               |
| T19 | ✓ | `PIPE`     | The native pipe (introduced R&nbsp;4.1.0)                         |
| T20 |   | `PIPEBIND` | The native pipebind.                                              |
| T21 | ✓ | `SPECIAL`  | Represents all binary operators of the form `%x%`.                |
| T22 | ✓ | `+`        | Vectorized binary operator addition or unary operator plus.       |
| T23 | ✓ | `-`        | Vectorized binary operator subtraction or unary operator minus.   |
| T24 | ✓ | `*`        | The vectorized binary operator multiplication.                    |
| T25 | ✓ | `/`        | The vectorized binary operator division.                          |
| T26 | ✓ | `:`        | The non-vectorized sequence operator.                             |
| T27 | ✓ | `!`        | The vectorized logical unary operator not operator.               |
| T28 | ✓ | `^`        | The vectorized exponentiation operator (exponent must be scalar). |
| T29 | ✓ | `?`        | Triggers the help action.                                         |
| T30 | ✓ | `~`        | Signals a model formula.                                          |

## Tokens Representing Control-Flow Structures

| #   | ✓ | Token     | Description                                          |
|:----|:-:|:----------|:-----------------------------------------------------|
| T31 | ✓ | `BREAK`   | The break construct in a loop.                       |
| T32 | ✓ | `ELSE`    | Signals start of the else part of an `IF` statement. |
| T33 | ✓ | `FOR`     | Start of a for loop structure.                       |
| T34 | ✓ | `forcond` | Signals the `x IN v` head of the `FOR` loop.         |
| T35 | ✓ | `IF`      | Start of an if conditional structure.                |
| T36 | ✓ | `IN`      | Used to separate name and vector in a for loop.      |
| T37 | ✓ | `NEXT`    | The next construct in a loop.                        |
| T38 | ✓ | `REPEAT`  | Start of a repeat loop structure.                    |
| T39 | ✓ | `WHILE`   | Start of a while loop structure.                     |

## Tokens Indicating a Function Definition

| #   | ✓ | Token      | Description                                   |
|:----|:-:|:-----------|:----------------------------------------------|
| T40 | ✓ | `FUNCTION` | Indicates the start of a function definition. |
| T41 | ✓ | `\`        | Indicates the start of a lambda function.     |

## Tokens Used to Access Objects

| #   | ✓ | Token  | Description                                     |
|:----|:-:|:-------|:------------------------------------------------|
| T42 | ✓ | `LBB`  | Indicates the start of a double bracket access. |
| T43 | ✓ | `SLOT` | Target of a slotted access.                     |
| T44 | ✓ | `$`    | Indicates dollar access.                        |
| T45 | ✓ | `@`    | Indicates slotted access.                       |
| T46 | ✓ | `[`    | Indicates the start of a single bracket access. |
| T47 | ✓ | `]`    | Corresponding end of `[` or `LBB`.              |

## Tokens Representing Names

| #   | ✓ | Token                  | Description                                               |
|:----|:-:|:-----------------------|:----------------------------------------------------------|
| T48 | ✓ | `NS_GET`               | The access of an exported name.                           |
| T49 | ✓ | `NS_GET_INT`           | The access of an internal name.                           |
| T50 | ✓ | `SYMBOL`               | A name with a potential namespace (`x::y`).               |
| T51 | ✓ | `SYMBOL_FUNCTION_CALL` | The `SYMBOL` of a function call.                          |
| T52 | ✓ | `SYMBOL_PACKAGE`       | Name used to access a namespace (`NS_GET`, `NS_GET_INT`). |
| T53 | ✓ | `SYMBOL_SUB`           | The name to the left of an `EQ-SUB`.                      |
| T54 | ✓ | `SYMBOL_FORMALS`       | The name to the left of an `EQ-FORMALS`.                  |

## Tokens Representing Comments or Directives

| #   | ✓ | Token            | Description               |
|:----|:-:|:-----------------|:--------------------------|
| T55 | ✓ | `COMMENT`        | A line comment.           |
| T56 | ✓ | `LINE_DIRECTIVE` | A line directive comment. |

## Tokens Used To Delimit Parts of Expressions

| #   | ✓ | Token | Description                                     |
|:----|:-:|:------|:------------------------------------------------|
| T57 | ✓ | `(`   | An opening parenthesis (e.g., in a `FOR`-loop). |
| T58 | ✓ | `)`   | Corresponding end of `(`.                       |
| T59 | ✓ | `,`   | Separates for example formal arguments.         |
| T60 | ✓ | `;`   | Separates expressions.                          |
| T61 | ✓ | `{`   | Groups expressions, no effect on scoping.       |
| T62 | ✓ | `}`   | Corresponding end of `{`.                       |


## Tokens Representing Meta-Elements

| #   | ✓ | Token                    | Description                                                                                                                                |
|:----|:-:|:-------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------|
| T63 | ✓ | `expr`                   | Represents an expression.                                                                                                                  |
| T64 | ✓ | `expr_or_assign_or_help` | Used for example by `EQ-ASSIGN`, with the same semantics as `expr`.                                                                        |
| T65 | ✓ | `exprlist`               | Added by [xml_parse_data](https://www.rdocumentation.org/packages/xmlparsedata/versions/1.0.5/topics/xml_parse_data) to group expressions, no longer used since [#659](https://github.com/Code-Inspect/flowr/pull/659). |