***This wiki page is currently under construction (currently, references to the tokens are missing, and not all capabilities have been added)***

Based on the collection of capabilities in my [master's thesis](http://dx.doi.org/10.18725/OPARU-50107), this page collects the potentially evolving list of R's capabilities and the extent to which *flowR* supports them.
In its current form, it is almost a verbatim copy of the corresponding appendix in my master's thesis.

*flowR*'s support is divided into three categories:

1. **full**: *flowR* supports the capability completely.
2. **partial**: *flowR* supports the capability partially (explained further alongside the explanation text).
3. **no**: *flowR* does not support the capability at all.

We split the capabilities into the following sections, feel free to extend them in the future, but keep the enumeration:

<!-- TOC -->
- [Structure of an R Program](#structure-of-an-r-program)
  - [Values](#values)
  - [Data Types](#data-types)
  - [Assignments and Bindings](#assignments-and-bindings)
  - [Control Flow](#control-flow)
  - [Vectorization](#vectorization)
- [Environments and Scoping](#environments-and-scoping)
  - [Libraries and Namespaces](#libraries-and-namespaces)
- [Defining and Calling Functions](#defining-and-calling-functions)
  - [General Functions](#general-functions)
  - [Operators](#operators)
  - [Pipes](#pipes)
  - [Important Functions](#important-functions)
- [Class Systems and Object-Oriented Programming](#class-systems-and-object-oriented-programming)
- [Meta-Programming and Reflection](#meta-programming-and-reflection)
  - [General](#general)
  - [Parsing](#parsing)
  - [Function Definitions and Calls](#function-definitions-and-calls)
- [Miscellaneous](#miscellaneous)
  - [Interfacing with R](#interfacing-with-r)
  - [Roxygen](#roxygen)
<!-- TOC -->

## Structure of an R Program

<!-- I use an enumerated list so that in case the numbers change there is no need to change *everything* -->

<ol>
<li> <details> <summary><b>Name</b>&emsp;(full)</summary>

Usually, names are referred to as symbols and they most often represent a variable name, although they are part of a function call as well. They can be created from strings, with functions like [base::as.name](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/name) or [rlang::sym](https://www.rdocumentation.org/packages/rlang/versions/1.1.1/topics/sym) from the [rlang](https://www.rdocumentation.org/packages/rlang/versions/1.1.1) package (see [Section 2.1.3.1](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Symbol-objects) of the R language definition).
The definition of what exactly
can be part of a name can be found in [Section 10.3.2](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Identifiers) of the language definition, allowing an identifier to be "a sequence of letters, digits, the
period, and the underscore" with the restriction that it cannot start with a
digit or with a period followed by a digit and the precise definition being
dependent on the current locale.

It should be noted, however, that besides the usual identifiers, R does
allow the use of backticks and strings to create names that do not follow
the rules. Hence, `'2' <- 42` is valid R code and assigns the value&nbsp;`42` to
the name&nbsp;`"2"`. This is no different from&nbsp;`"2" <- 42` (although the tokens
are different, with `SYMBOL` for the first, and `STR_CONST` for the second example).
However, when trying to access the value bound to the name,
one can use backticks but neither double nor single quotes as they evaluate
to the corresponding string.
Yet, there are reflective functions like get
which allow to use strings.

Besides these rules, [Section 10.3.3](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Reserved-words) of the R language definition defines
a set of reserved words that can not be used as object names. Nevertheless,
they still can be assigned (although some require the use of backticks).
With this, `... <- 3` and `` `if` <- 42 `` are valid. The values can be queried
with `get("...")` and `get("if")`, respectively.

*flowR* supports all of these variants. Most are already handled by the used
R parser, with the normalization allowing assignments to strings, and the
dataflow analysis handling the use of backticks. Querying a value with a
function like get, however, is currently not supported.

</details>
</li>

<li> <details> <summary><b>Expression</b>&emsp;(full)</summary>

   Within [Section 2.1.4](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Expression-objects), the language definition specifies an expression
  to consist of one or more statements, with the term "statement" explicitly
  referring to any "syntactically correct collection of tokens". This means,
  that R uses the term "expression" to refer to unevaluated but parsed
  R code. The explicit evaluation of an expression can be triggered with the
  [base::eval](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/eval) function, although the evaluation of an expression is usually done
  implicitly by the interpreter, only stopped by functions like [base::quote](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/substitute) or [base::expression](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/expression). An expression (`expr`<sup>T63</sup> ) may contain multiple other expressions
  and is often referred to as an expression list (`exprlist`<sup>T65</sup>) in that case.
  Usually,&nbsp;R uses newlines to separate expressions.

  From a syntactical perspective, the handling of expressions is completely
  the responsibility of the R parser. However, the normalization adds a set
  of semantic constraints regarding our understanding of what exactly is
  allowed in R. Hence, *flowR*’s support is limited to this understanding.

</details>
</li>


<li> <details> <summary><b>Call</b>&emsp;(full)</summary>

A call refers not just to the *call* of a conventional *function* but also the
call of operators and even to structures like *if*, *for*, *while*, and *repeat* loops. While the exact notion of what a call refers to is
of lesser interest, it is usually used for the "call"-mode.

Within this thesis, we use the term "call" to refer to explicit *function calls*, as *flowR* handles structures like a for loop as language constructs and not  as functions.
</details>
</li>

</ol>

These three basic objects alone do not reveal much about the details of an R&nbsp;program. See the [Tokens](https://github.com/Code-Inspect/flowr/wiki/Tokens) wiki page for an overview of all tokens that can be produced by the R&nbsp;interpreter.

<ol start="4">

<li> <details> <summary><b>Grouping</b>&emsp;(full)</summary>


Similar to several other languages like Java or TeX,&nbsp;R allows grouping
expressions with the help of `{`<sup>T61</sup> and `}`<sup>T62</sup>. However, differing from those
languages, these groups do not introduce a new *scope*.

Within an expression, the tokens `(`<sup>T57</sup>
and `)`<sup>T58</sup>
can be used for grouping as well, only excluding the context of *function calls* and *function definitions*
in which they are used to denote the arguments and parameters respectively. Just like in mathematics and most programming languages, `(`<sup>T57</sup> and
`)`<sup>T58</sup> can be used to manipulate the evaluation order.

Since the R&nbsp;parser does only handle the precedence change of `(`<sup>T57</sup> and `)`<sup>T58</sup>
and the grouping with `{`<sup>T61</sup> and `}`<sup>T62</sup>, the normalization has to deal with the use of delimiters within function arguments, parameters, and expressions.

</details></li>

<li> <details> <summary><b>Separators</b>&emsp;(full)</summary>

Separators help R to distinguish between otherwise ambiguous expressions
like `a <- 1` and `a < -1`. They are partially defined by [Section 10.3.5](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Separators),
with more separator tokens on the [Tokens](https://github.com/Code-Inspect/flowr/wiki/Tokens#tokens-used-to-delimit-parts-of-expressions) wiki page. The most common
separator is the usage of whitespace which is automatically handled by the [base::parse](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/parse) function. Although R allows to separate expressions with a `;`<sup>T60</sup>
,
this is [discouraged](https://style.tidyverse.org/syntax.html#semicolons), and not handled by the R&nbsp;parser.

Nevertheless, the normalization of *flowR* does handle the use of semicolons, as well as `,`<sup>T59</sup>, in combination with arguments and parameters.
</details></li>

</ol>

### Values

<ol start="6">

<li> <details> <summary><b>Number</b>&emsp;(partial)</summary>

R separates three different types of numbers: integer, complex, and
"numeric", which corresponds to the intuitive understanding of a double.
`2`, `4e2`, and `-3.1` are all numeric constants in&nbsp;R [(Section 3.1.1)](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Constants).

Currently, this capability is ignored in the dataflow analysis of *flowR*, but
it is fully supported by the normalization step.

</details></li>

<li> <details> <summary><b>Integer</b>&emsp;(partial)</summary>

Numbers which are suffixed by an `L` to indicate, that they are a constant
integer.

Similar to numbers, we ignore this capability in the dataflow analysis of
*flowR* but support it with the normalization step.
</details></li>

<li> <details> <summary><b>Complex</b>&emsp;(partial)</summary>

Using the suffix `i`, R allows to specify complex numbers like `3i`.

Similar to the other numbers, we ignore this capability in the dataflow
analysis of *flowR* but support it with the normalization step.
</details></li>

<li> <details> <summary><b>Float Hexadecimal Numbers</b>&emsp;(partial)</summary>

As a special way of specifying numbers,&nbsp;R allows for the ["C99-style"](https://gcc.gnu.org/onlinedocs/gcc/Hex-Floats.html) of
hexadecimal floating-point constants [(Section 10.3.1)](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Literal-constants).

Similar to numbers, we ignore this capability in the dataflow analysis of
*flowR* but support it with the normalization step.
</details></li>

<li> <details> <summary><b>Logical</b>&emsp;(partial)</summary>

The "logical" represents the boolean type of&nbsp;R, expressed by `TRUE` and
`FALSE` (which are also accessible by the aliases&nbsp;`T` and&nbsp;`F`). Similar to other
languages, non-empty and non-zero values are considered "truthy" (i.e.,&nbsp;`!1`
evaluates to `FALSE`).

While we have limited support for `if(TRUE)` and `if(FALSE)` in the dataflow
analysis, and fully support logicals in the normalization, there is no special
behavior for logical values in *flowR*.
</details></li>

<li> <details> <summary><b>String</b>&emsp;(partial)</summary>

Although strings are vectors, they have a length of one as defined in
[Section 2.1.1](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Vector-objects) of the&nbsp;R language definition.
Strings can be created using either single or double quotes.

Similar to numbers, we ignore this capability in the dataflow analysis of
*flowR* but support it in our normalization.
</details></li>

<li> <details> <summary><b>Vector</b>&emsp;(no)</summary>

Vectors are essentially arrays with a dynamic length, defined in [Section 2.1.1](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Vector-objects) of the&nbsp;R language definition.

However, without any type inference in the current implementation of *flowR*, we do not have to do anything special to support them during any of the steps of our analysis.
</details></li>

<li> <details> <summary><b>List</b>&emsp;(no)</summary>

Defined in [Section 21.2](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#List-objects) of the&nbsp;R
language definition, lists are a special form of vectors, "generic vectors", that allow each element to have a different
type. Furthermore, the individual elements of a list can be named `l <- list(a=1,b=2)` and consequently accessed by named access
as `l$a`. An old and deprecated variant of lists are pairlists, defined in [Section 2.1.11](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Pairlist-objects) of the&nbsp;R language definition.

Similar to vectors, there is currently no special support for lists.
</details></li>

<li> <details> <summary><b>Matrix</b>&emsp;(no)</summary>

Matrices are essentially multidimensional vectors (or vectors are matrices with only one column). For example,
the expression `m <- matrix(1:4, nrow=2, ncol=2)`
creates the matrix $`m =\left(\begin{smallmatrix}
1 & 3 \\
2 & 4
\end{smallmatrix}\right)`$ as a vector of vectors using the matrix function [(Section 3.4.2)](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Indexing-matrices-and-arrays).

As with lists, there is currently no special support for matrices implemented in *flowR*.
</details></li>

<li> <details> <summary><b>Data Frame</b>&emsp;(no)</summary>

A data frame is a list of elements (vectors, matrices, or factors) all
with the same length, and probably best described as a table structure [(Section 2.3.2)](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Data-frame-objects).

As with vectors and lists, there is currently no special support for data frames, nor is it necessary (without, e.g., abstract interpretation).
</details></li>

<li> <details> <summary><b>Factor</b>&emsp;(no)</summary>

Factors are a special form of an ordered or unordered "enum" - items that
can only have a finite number of values. Depending on the requirements, they can be represented as a vector.

As with vectors and data frames we handle factors as any other value.
</details></li>

<li> <details> <summary><b>NULL</b>&emsp;(partial)</summary>

`NULL` is a special and unique object used to specifically mark the absence
of an object [(Section 2.1.6)](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#NULL-object).

Just like numbers we currently do not treat `NULL` in any special way, although we prevent assignments and references during the dataflow
analysis.
</details></li>


<li> <details> <summary><b>NA</b>&emsp;(partial)</summary>

`NA` is a special value that indicates that a value is "present" but unknown,
as defined in [Section 3.3.4](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Elementary-arithmetic-operations) in the&nbsp;R language definition.

As long as we do not support abstract interpretation or values during
the dataflow analysis, there is no need to treat `NA` in any
special way (although we prevent assignments and references, similar to
our handling of `NULL`).
</details></li>

</ol>

### Data Types

R is dynamically typed and assigns a type to each R object, which can be
queried at runtime with the `typeof` function. The list of existing types is
documented at the beginning of [Section 2](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Objects).
These types include symbols, primitive types like characters, booleans (logical values), integers,
doubles, complex numbers, and more. Since the intricate details of these
types (like their storage mode) are of no interest for *flowR* in its current
form — without abstract interpretation and no type inference — we do
not go into detail here.

<ol start="19">

<li> <details> <summary><b>Single Bracket Access</b>&emsp;(partial)</summary>

Using `[` to access a list returns a list of selected elements, as it allows
to index the list by a vector as well, as defined in [Section 3.4.1](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Indexing-by-vectors) of the&nbsp;R language definition.
For example, with `v <- c(1,2,3)`, the access with `v[c(TRUE,FALSE,TRUE)]` returns the vector `c(1,3)`.
Furthermore, it is possible to access multidimensional structures like `x[i, j]`, and to use
an "empty" vector for indexing, which returns the whole vector, but
without its attributes except for "names", "dim", and "dimnames".
As an example, `v[] <- 1` sets all elements of `v` to `1`, and `m[1,]` returns the first row of a matrix `m` (indexing starts at `1`).

Currently, *flowR* does not differentiate between the elements of a vector or a list. Therefore, it considers every access as a potential access to all elements.

</details></li>

<li> <details> <summary><b>Double Bracket Access</b>&emsp;(partial)</summary>

While rarely used for a vector or matrix, `[[` is common when only a single element of a list is of interest. In that way, it is similar to the array access in Java or C++. Like the single bracket variant, it can be used to
access a single element in multidimensional data structures like a matrix with `m[[1,2]]`.

Again, *flowR* does not differentiate between the individual elements of objects and therefore treats every access as potentially accessing all elements.

</details></li>

<li> <details> <summary><b>Dollar Access</b>&emsp;(partial)</summary>

The "dollar" or "named" access with `$` allows to access named lists like
`l <- list(a=1,b=2)`. While either the usage of a string as in `l$"a"` or a
symbol as in `l$a` is possible, both behave the same, using the name `"a"` (i.e.,
the symbol is not resolved). In general, the index is not computable when
using name-based access, as defined in [Section 3.4](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Indexing) of the&nbsp;R language definition.
This allows to group related functions, for example, as:

```R
l <- list(a=\() 3, b=\() 4)
```

Then, for example, the first lambda function can be called as `l$a()`. While
*flowR* realizes, that an element of `l` is called, it does not properly identify
the called element, handling the access similar to single and double bracket
access.
</details></li>

<li> <details> <summary><b>Slotted Access</b>&emsp;(partial)</summary>

The access with `@`, the "[slotOp](https://rdrr.io/r/base/slotOp.html)", allows to access contents of a `S4` class
structure. In a way, this is just a glorified named list that is linked to a
class:

```R
setClass("Pengu", slots=list(name="character", age="numeric"))
p <- new("Pengu", name="Tux", age=42)
```

With this, we define a new class named "Pengu", with two slots: "name"
of type character and "age" of type numeric. The next line creates the
42-year-old penguin named "Tux". Now, we can access its name as `p@name`
and its age as `p@age`.

Currently, *flowR* has no concept of these classes and hence no special
support for OOP-principles. Therefore, it treats `p@name` as a potential
access to all elements of `p`.
</details></li>

<li> <details> <summary><b>Vector-based Index</b>&emsp;(partial)</summary>

As described alongside the single bracket access R19 and defined in [Section 3.4.1](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Indexing-by-vectors) of the&nbsp;R language definition, a vector like `v <- c(3,4,5)`,
can be accessed as `v[c(1,3)]`, returning the first and third element of `v`.

Similar to all the other ways of access, *flowR* treats this as possibly accessing
all elements of `v`.
</details></li>

<li> <details> <summary><b>Arguments In Access</b>&emsp;(partial)</summary>

Given a data frame, the corresponding access operators like the single
bracket access, are modified, so they accept arguments. This way, `d$name`
is equivalent `d[["name", exact=FALSE]]`.

While explained at length in the [Extract topic](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/Extract) of the&nbsp;R documentation, the
details are not relevant for the current implementation of *flowR*.
</details></li>

<li> <details> <summary><b>Mode</b>&emsp;(partial)</summary>

R separates the type of an object, from its mode (the “basic structure” of
the object), and its `storage.mode`, which can be queried by [mode](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/mode).

However, this is currently of no interest to *flowR*, as it ignores typing
information.
</details></li>
</ol>

### Assignments and Bindings

<ol start="26">

<li> <details> <summary><b>Local Left Assignment</b>&emsp;(full)</summary>

Identified by an expression consisting of the tokens `expr`, `LEFT_ASSIGN`, `expr` with the `<-` lexeme, the local left assignment is the ["recommended"](https://style.tidyverse.org/syntax.html#assignment-1) way of binding a name to a value in R (although the topic of if `=` is better than `<-` is heavily discussed).
It binds its *RHS* expression to its *LHS* which is expected to be a name within the current environment.

Furthermore, the local left assignment returns its *RHS* but wrapped with
the [invisible](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/invisible) function, which prevents the result from being printed
automatically within the R interpreter. This allows nested assignments like
`x <- y <- 1` to work as expected, binding both, `x` and `y` to the value `1`.

*flowR* offers full support for this assignment but does currently ignore
potential re-definitions of the `<-` operator.

</details></li>

<li> <details> <summary><b>Local Right Assignment</b>&emsp;(full)</summary>

Similar to local left assignment, but with the role of the left-hand and the
right-hand side swapped. In `3 -> x`, the name `x` is bound to the value `3`.
Likewise, it returns its *LHS* wrapped with [invisible](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/invisible).

Similar to the local left assignment, *flowR* offers full support for this assignment but ignores potential re-definitions.

</details></li>

<li> <details> <summary><b>Local Equal Assignment</b>&emsp;(full)</summary>

On the top level or within a group, using `=` binds an expression to a
name. The assignment `x = 3` works like the local left assignment. However,
within arguments and parameter the behavior changes, alongside the
corresponding change in the token type from `EQ_ASSIGN` to `EQ_SUB`
and `EQ_FORMALS`.
For another important differentiation when used in arguments, we recommend Section&nbsp;8.2.26 of the great [The R Inferno](https://www.burns-stat.com/pages/Tutor/R_inferno.pdf) by Burns.

Besides using `=`, there is the older variant of the local equal assignment
using an additional colon: `:=`. While (from [lintr](https://github.com/r-lib/lintr/blob/3d9e6d78efe7fc41d8b545a845a984a0821cfbbe/R/assignment_linter.R#L95-L96))
> it’s [`:=`] extremely uncommon as a normal assignment operator

the operator is usually overloaded (see the [op-colon-equals](https://www.rdocumentation.org/packages/rlang/versions/0.0.0.9000/topics/op-colon-equals) topic of [rlang](https://cran.r-project.org/package=rlang)).

Again, *flowR* offers full support for this assignment but ignores potential
re-definitions.
</details></li>

<li> <details> <summary><b>Global Left Assignment</b>&emsp;(partial)</summary>

The global left assignment works as the local left assignment but does not
bind the name in the currently active environment. Instead, it searches for
the name in the parent environment (see Wickham's "Advanced R", [Section 7.2.4](https://adv-r.hadley.nz/environments.html#super-assignment--) and [Section 7.4.1](https://adv-r.hadley.nz/environments.html#search-path)).

While *flowR* offers support for the global left assignment we can not be
sure that it handles it correctly in every case, as we can not definitely
determine the lowest environment that holds the definition of a name (as
this may be dependent on the dynamic call stack).
</details></li>

<li> <details> <summary><b>Global Right Assignment</b>&emsp;(partial)</summary>

Just like the local right assignment is similar to the local left assignment,
the global right assignment is similar to its global left counterpart. So
`3 ->> x` globally binds the name&nbsp;`x` to the value&nbsp;`3`.

*flowR* supports the global right assignment the same way as the global left
assignment.
</details></li>

<li> <details> <summary><b>Return Value Of Assignments</b>&emsp;(partial)</summary>

Every assignment [invisibly](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/invisible) returns its source. Hence, `a <- 3` returns `3`,
and `5 ->> b` returns `5`.

*flowR* supports this behavior, by keeping the ingoing references in the processing of assignments. However, it does not mark the value as "invisible".
</details></li>

<li> <details> <summary><b>Special Assignment</b>&emsp;(partial)</summary>

For all of the assignments,&nbsp;R has special variants, when combined with the
access operators. For example, there is "`[<-`" (explained alongside [Extract](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/Extract) topic of the base package), when assigning the single value of a vector as in `x[1] <- 3`.

The current implementation of *flowR* does not offer special support for
these assignments, but treats them like the assignment without the access
operator (e.g., it treats "`[<-`" just like "`<-`"). Nevertheless, the processor
for the `RAccess` node, still causes the effect of the assignment
to be labeled as "maybe" so that the definition is treated as a potential
redefinition of every cell in the vector or list.
</details></li>

<li> <details> <summary><b>Range Assignments</b>&emsp;(partial)</summary>

As already explained alongside the usage of vectors for indexing,&nbsp;R allows
an assignment like `v[1:3] <- 4:6` which causes the first three elements of the vector to be&nbsp;`4`,&nbsp;`5`, and&nbsp;`6` respectively.

As with the special assignments, *flowR* does not offer special support for
this kind of assignment.
</details></li>

<li> <details> <summary><b>Assign Functions</b>&emsp;(no)</summary>

Besides the assignment operators like the local left assignment, R offers
various functions like [assign](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/assign) and [rbind](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/cbind) that can be used to assign values to names.

Currently, all of them are not supported by *flowR*.
</details></li>

<li> <details open> <summary><b>Locked Assignments</b>&emsp;(no)</summary>

R allows to lock bindings so that they can no longer be changed. For example, after calling [lockBinding](https://stat.ethz.ch/R-manual/R-devel/library/base/html/bindenv.html) with `lockBinding('T', environment())`, subsequent assignments to "`T`" cause an error.

However, we ignore this in our current implementation of *flowR*.
</details></li>
</ol>

### Control Flow

### Vectorization

## Environments and Scoping

### Libraries and Namespaces

## Defining and Calling Functions

### General Functions

### Operators

### Pipes

### Important Functions

## Class Systems and Object-Oriented Programming

## Meta-Programming and Reflection

### General

### Parsing

### Function Definitions and Calls

## Miscellaneous

### Interfacing with R

### Roxygen
