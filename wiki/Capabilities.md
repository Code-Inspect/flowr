_This document was generated automatically from '/home/runner/work/flowr/flowr/src/r-bridge/data/print.ts' on 2024-06-02, 14:07:37 UTC summarizig flowR's current capabilities_

The code-font behind each capability name is a link to the capability's id. This id can be used to reference the capability in a labeled test within flowR.
Besides, we use colored bullets like this:

| <!-- -->               | <!-- -->                                              |
| ---------------------- | ----------------------------------------------------- |
| :green_square:         | _flowR_ is capable of handling this feature fully     |
| :large_orange_diamond: | _flowR_ is capable of handling this feature partially |
| :red_circle:           | _flowR_ is not capable of handling this feature       |

:cloud: This could be a feature diagram... :cloud:

 1. **Names and Identifiers** (<a id='names-and-identifiers'>`names-and-identifiers`</a>)
     1. **Form** (<a id='form'>`form`</a>)
         1. **Normal** (<a id='name-normal'>`name-normal`</a>)\
        :green_square: _Recognize constructs like `a`, `plot`, ..._
         2. **Quoted** (<a id='name-quoted'>`name-quoted`</a>)\
        :green_square: _Recognize `"a"`, `'plot'`, ..._
         3. **Escaped** (<a id='name-escaped'>`name-escaped`</a>)\
        :green_square: _Recognize `` `a` ``, `` `plot` ``, ..._
     2. **Resolution** (<a id='resolution'>`resolution`</a>)
         1. **Global Scope** (<a id='global-scope'>`global-scope`</a>)\
        :green_square: _For example, tracking a big table of current identifier bindings_
         2. **Lexicographic Scope** (<a id='lexicographic-scope'>`lexicographic-scope`</a>)\
        :green_square: _For example, support function definition scopes_
         3. **Closures** (<a id='closures'>`closures`</a>)\
        :large_orange_diamond: _Handling [function factories](https://adv-r.hadley.nz/function-factories.html) and friends._ Currently, we do not have enough tests to be sure.
         4. **Dynamic Environment Resolution** (<a id='dynamic-environment-resolution'>`dynamic-environment-resolution`</a>)\
        :red_circle: _For example, using `new.env` and friends_
         5. **Environment Sharing** (<a id='environment-sharing'>`environment-sharing`</a>)\
        :red_circle: _Handling side-effects by environments which are not copied when modified_
         6. **Search Path** (<a id='search-path'>`search-path`</a>)\
        :red_circle: _Handling [R's search path](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Search-path) as explained in [Advanced R](https://adv-r.hadley.nz/environments.html#search-path)._ Currently, _flowR_ does not support dynamic modifications with `attach`, `search`, or `fn_env` and tests are definitely missing. Yet, theoretically, the tooling is all there.
         7. **Namespaces** (<a id='namespaces'>`namespaces`</a>)\
        :red_circle: _Handling R's namespaces as explained in [Advanced R](https://adv-r.hadley.nz/environments.html#namespaces)_
         8. **Accessing Exported Names** (<a id='accessing-exported-names'>`accessing-exported-names`</a>)\
        :large_orange_diamond: _Resolving calls with `::` to their origin._ Accessing external files is allowed, although the name of packages etc. is not resolved correctly.
         9. **Accessing Internal Names** (<a id='accessing-internal-names'>`accessing-internal-names`</a>)\
        :red_circle: _Similar to `::` but for internal names._
        10. **Library Loading** (<a id='library-loading'>`library-loading`</a>)\
        :red_circle: _Resolve libraries identified with `library`, `require`, `attachNamespace`, ... and attach them to the search path_
 2. **Expressions** (<a id='expressions'>`expressions`</a>)
     1. **Function Calls** (<a id='function-calls'>`function-calls`</a>)
         1. **Grouping** (<a id='grouping'>`grouping`</a>)\
        :green_square: _Recognize groups done with `(`, `{`, ... (more precisely, their default mapping to the primitive implementations)._
         2. **Normal Call** (<a id='call-normal'>`call-normal`</a>)\
        :green_square: _Recognize and resolve calls like `f(x)`, `foo::bar(x, y)`, ..._
             1. **Unnamed Arguments** (<a id='unnamed-arguments'>`unnamed-arguments`</a>)\
          :green_square: _Recognize and resolve calls like `f(3)`, `foo::bar(3, c(1,2))`, ..._
             2. **Empty Arguments** (<a id='empty-arguments'>`empty-arguments`</a>)\
          :green_square: _Essentially a special form of an unnamed argument as in `foo::bar(3, ,42)`, ..._
             3. **Named Arguments** (<a id='named-arguments'>`named-arguments`</a>)\
          :green_square: _Recognize and resolve calls like `f(x = 3)`, `foo::bar(x = 3, y = 4)`, ..._
             4. **String Arguments** (<a id='string-arguments'>`string-arguments`</a>)\
          :green_square: _Recognize and resolve calls like `f('x' = 3)`, `foo::bar('x' = 3, "y" = 4)`, ..._
             5. **Resolve Arguments** (<a id='resolve-arguments'>`resolve-arguments`</a>)\
          :large_orange_diamond: _Correctly bind arguments (including [`pmatch`](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/pmatch))._ Currently, we do not have a correct implementation for `pmatch`. Furthermore, more tests would be nice.
             6. **Side-Effects in Argument** (<a id='side-effects-in-argument'>`side-effects-in-argument`</a>)\
          :large_orange_diamond: _Handle side-effects of arguments (e.g., `f(x <- 3)`, `f(x = y <- 3)`, ...)._ We have not enough tests to be sure
             7. **Side-Effects in Function Call** (<a id='side-effects-in-function-call'>`side-effects-in-function-call`</a>)\
          :large_orange_diamond: _Handle side-effects of function calls (e.g., `setXTo(3)`, ...) for example achieved with the super assignment._ We need more tests and handlings. Furthermore, we do not detect side effects with external files, network, logging, etc.
         3. **Anonymous Calls** (<a id='call-anonymous'>`call-anonymous`</a>)\
        :green_square: _Recognize and resolve calls like `(function(x) x)(3)`, `factory(0)()`, ..._
         4. **Infix Calls** (<a id='infix-calls'>`infix-calls`</a>)\
        :green_square: _Recognize and resolve calls like `x + y`, `x %>% f(y)`, ..._
         5. **Redefinition of Built-In Functions/primitives** (<a id='redefinition-of-built-in-functions-primitives'>`redefinition-of-built-in-functions-primitives`</a>)\
        :large_orange_diamond: _Handle cases like `print <- function(x) x`, `` `for` <- function(a,b,c) a``, ..._ Currently, we can not handle all of them there are no tests. Still wip as part of desugaring
         6. **Index Access** (<a id='index-access'>`index-access`</a>)
             1. **Single Bracket Access** (<a id='single-bracket-access'>`single-bracket-access`</a>)\
          :green_square: _Detect calls like `x[i]`, `x[i, ,b]`, `x[3][y]`, ... This does not include the real separation of cells, which is handled extra._
             2. **Double Bracket Access** (<a id='double-bracket-access'>`double-bracket-access`</a>)\
          :green_square: _Detect calls like `x[[i]]`, `x[[i, b]]`, ... Similar to single bracket._
             3. **Dollar Access** (<a id='dollar-access'>`dollar-access`</a>)\
          :green_square: _Detect calls like `x$y`, `x$"y"`, `x$y$z`, ..._
             4. **Slot Access** (<a id='slot-access'>`slot-access`</a>)\
          :green_square: _Detect calls like `x@y`, `x@y@z`, ..._
             5. **Access with Argument-Names** (<a id='access-with-argument-names'>`access-with-argument-names`</a>)\
          :green_square: _Detect calls like `x[i = 3]`, `x[[i=]]`, ..._
             6. **Access with Empty** (<a id='access-with-empty'>`access-with-empty`</a>)\
          :green_square: _Detect calls like `x[]`, `x[2,,42]`, ..._
             7. **Subsetting** (<a id='subsetting'>`subsetting`</a>)\
          :green_square: _Detect calls like `x[i > 3]`, `x[c(1,3)]`, ..._
         7. **Operators** (<a id='operators'>`operators`</a>)
             1. **Unary Operator** (<a id='unary-operator'>`unary-operator`</a>)\
          :green_square: _Recognize and resolve calls like `+3`, `-3`, ..._
             2. **Binary Operator** (<a id='binary-operator'>`binary-operator`</a>)\
          :green_square: _Recognize and resolve calls like `3 + 4`, `3 * 4`, ..._
                 1. **Special Operator** (<a id='special-operator'>`special-operator`</a>)\
            :green_square: _Recognize and resolve calls like `3 %in% 4`, `3 %*% 4`, ..._
                 2. **Model Formula** (<a id='model-formula'>`model-formula`</a>)\
            :large_orange_diamond: _Recognize and resolve calls like `y ~ x`, `y ~ x + z`, ... including their implicit redefinitions of some functions._ Currently, we do not handle their redefinition and only treat model formulas as normal binary operators
                 3. **Assignments and Bindings** (<a id='assignments-and-bindings'>`assignments-and-bindings`</a>)
                     1. **Local Left Assignment** (<a id='local-left-assignment'>`local-left-assignment`</a>)\
              :green_square: _Handle `x <- 3`, `x$y <- 3`, ..._
                     2. **Local Right Assignment** (<a id='local-right-assignment'>`local-right-assignment`</a>)\
              :green_square: _Handle `3 -> x`, `3 -> x$y`, ..._
                     3. **Local Equal Assignment** (<a id='local-equal-assignment'>`local-equal-assignment`</a>)\
              :green_square: _Handle `x = 3`, `x$y := 3`, ..._
                     4. **Super Left Assignment** (<a id='super-left-assignment'>`super-left-assignment`</a>)\
              :green_square: _Handle `x <<- 42`, `x$y <<- 42`, ..._
                     5. **Super Right Assignment** (<a id='super-right-assignment'>`super-right-assignment`</a>)\
              :green_square: _Handle `42 ->> x`, `42 ->> x$y`, ..._
                     6. **Return Value of Assignments** (<a id='return-value-of-assignments'>`return-value-of-assignments`</a>)\
              :green_square: _Handle `x <- 3` returning `3`, e.g., in `x <- y <- 3`_
                     7. **Assignment Functions** (<a id='assignment-functions'>`assignment-functions`</a>)\
              :large_orange_diamond: _Handle `assign(x, 3)`, `delayedAssign(x, 3)`, ..._ Currently we can not handle all of them and tests are rare.
                     8. **Range Assignment** (<a id='range-assignment'>`range-assignment`</a>)\
              :green_square: _Handle `x[1:3] <- 3`, `x$y[1:3] <- 3`, ..._
                     9. **Replacement Functions** (<a id='replacement-functions'>`replacement-functions`</a>)\
              :large_orange_diamond: _Handle `x[i] <- 3`, `x$y <- 3`, ... as `` `[<-`(x, 3) ``, ..._ Currently work in progress as part of the desugaring but still untested.
                    10. **Locked Bindings** (<a id='locked-bindings'>`locked-bindings`</a>)\
              :red_circle: _Handle `lockBinding(x, 3)`, ..._
         8. **Control-Flow** (<a id='control-flow'>`control-flow`</a>)
             1. **if** (<a id='if'>`if`</a>)\
          :green_square: _Handle `if (x) y else z`, `if (x) y`, ..._
             2. **for loop** (<a id='for-loop'>`for-loop`</a>)\
          :green_square: _Handle `for (i in 1:3) print(i)`, ..._
             3. **while loop** (<a id='while-loop'>`while-loop`</a>)\
          :green_square: _Handle `while (x) b`, ..._
             4. **repeat loop** (<a id='repeat-loop'>`repeat-loop`</a>)\
          :green_square: _Handle `repeat {b; if (x) break}`, ..._
             5. **break** (<a id='break'>`break`</a>)\
          :green_square: _Handle `break` (including `break()`) ..._
             6. **next** (<a id='next'>`next`</a>)\
          :green_square: _Handle `next` (including `next()`) ..._
             7. **switch** (<a id='switch'>`switch`</a>)\
          :green_square: _Handle `switch(3, "a", "b", "c")`, ..._
             8. **return** (<a id='return'>`return`</a>)\
          :green_square: _Handle `return(3)`, ... in function definitions_
             9. **exceptions** (<a id='exceptions'>`exceptions`</a>)\
          :red_circle: _Handle `try`, `stop`, ..._
         9. **Function Definitions** (<a id='function-definitions'>`function-definitions`</a>)
             1. **Normal** (<a id='normal-definition'>`normal-definition`</a>)\
          :green_square: _Handle `function() 3`, ..._
             2. **Formals** (<a id='formals'>`formals`</a>)
                 1. **Named** (<a id='formals-named'>`formals-named`</a>)\
            :green_square: _Handle `function(x) x`, ..._
                 2. **Default** (<a id='formals-default'>`formals-default`</a>)\
            :green_square: _Handle `function(x = 3) x`, ..._
                 3. **Dot-Dot-Dot** (<a id='formals-dot-dot-dot'>`formals-dot-dot-dot`</a>)\
            :green_square: _Handle `function(...) 3`, ..._
                 4. **Promises** (<a id='formals-promises'>`formals-promises`</a>)\
            :large_orange_diamond: _Handle `function(x = y) { y <- 3; x }`, `function(x = { x <- 3; x}) { x * x }`, ..._ We _try_ to identify promises correctly but this is really rudimentary.
             3. **Implicit Return** (<a id='implicit-return'>`implicit-return`</a>)\
          :green_square: _Handle the return of `function() 3`, ..._
             4. **Lambda Syntax** (<a id='lambda-syntax'>`lambda-syntax`</a>)\
          :green_square: _Support `\(x) x`, ..._
        10. **Important Built-Ins** (<a id='important-built-ins'>`important-built-ins`</a>)
             1. **Non-Strict Logical Operators** (<a id='non-strict-logical-operators'>`non-strict-logical-operators`</a>)\
          :green_square: _Handle `&&`, `||`, ..._
             2. **Pipe and Pipe-Bind** (<a id='built-in-pipe-and-pipe-bind'>`built-in-pipe-and-pipe-bind`</a>)\
          :large_orange_diamond: _Handle the [new (4.1) pipe and pipe-bind syntax](https://www.r-bloggers.com/2021/05/the-new-r-pipe/): `|>`, and `=>`._ We have not enough tests and do not support pipe-bind.
             3. **Sequencing** (<a id='built-in-sequencing'>`built-in-sequencing`</a>)\
          :red_circle: _Handle `:`, `seq`, ... by gathering value information using abstract interpretation._
             4. **Internal and Primitive Functions** (<a id='built-in-internal-and-primitive-functions'>`built-in-internal-and-primitive-functions`</a>)\
          :red_circle: _Handle `.Internal`, `.Primitive`, ..._ In general we can not handle them as they refer to non-R code. We currently do not support them when used with the function.
             5. **Options** (<a id='built-in-options'>`built-in-options`</a>)\
          :red_circle: _Handle `options`, `getOption`, ..._ Currently, we do not support the function at all.
             6. **Help** (<a id='built-in-help'>`built-in-help`</a>)\
          :large_orange_diamond: _Handle `help`, `?`, ..._ We do not support the function in a sensible way but just ignore it (although this does not happen resolved).
             7. **Reflection / "Computing on the Language"** (<a id='reflection-"computing-on-the-language"'>`reflection-"computing-on-the-language"`</a>)
                 1. **Get Function Structure** (<a id='get-function-structure'>`get-function-structure`</a>)\
            :red_circle: _Handle `body`, `formals`, `environment` to access the respective parts of a function._ We do not support the functions at all.
                 2. **Modify Function Structure** (<a id='modify-function-structure'>`modify-function-structure`</a>)\
            :red_circle: _Handle `body<-`, `formals<-`, `environment<-` to modify the respective parts of a function._ We do not support the functions at all.
                 3. **Quoting** (<a id='built-in-quoting'>`built-in-quoting`</a>)\
            :large_orange_diamond: _Handle `quote`, `substitute`, `bquote`, ..._ We partially ignore some of them but most likely not all.
                 4. **Evaluation** (<a id='built-in-evaluation'>`built-in-evaluation`</a>)\
            :red_circle: _Handle `eval`, `evalq`, `eval.parent`, ..._ We do not handle them at all.
                 5. **Parsing** (<a id='built-in-parsing'>`built-in-parsing`</a>)\
            :red_circle: _Handle `parse`, `deparse`, ..._ We handle them as unknown function calls, but not specifically besides that.
     2. **Literal Values** (<a id='literal-values'>`literal-values`</a>)
         1. **Numbers** (<a id='numbers'>`numbers`</a>)\
        :green_square: _Recognize numbers like `3`, `3.14`, `NA`, float-hex, ..._
         2. **Strings** (<a id='strings'>`strings`</a>)\
        :green_square: _Recognize strings like `"a"`, `'b'`, ..._
             1. **Raw Strings** (<a id='raw-strings'>`raw-strings`</a>)\
          :green_square: _Recognize raw strings like `r"(a)"`, ..._
         3. **Logical** (<a id='logical'>`logical`</a>)\
        :green_square: _Recognize the logicals `TRUE` and `FALSE`, ..._
         4. **NULL** (<a id='null'>`null`</a>)\
        :green_square: _Recognize `NULL`_
         5. **Inf and NaN** (<a id='inf-and-nan'>`inf-and-nan`</a>)\
        :green_square: _Recognize `Inf` and `NaN`_
 3. **Non-Standard Evaluations/Semantics** (<a id='non-standard-evaluations-semantics'>`non-standard-evaluations-semantics`</a>)
     1. **Recycling** (<a id='recycling'>`recycling`</a>)\
      :red_circle: _Handle recycling of vectors as explained in [Advanced R](https://adv-r.hadley.nz/vectors-chap.html)._ We do not support recycling.
     2. **Vectorized Operator or Functions** (<a id='vectorized-operator-or-functions'>`vectorized-operator-or-functions`</a>)\
      :red_circle: _Handle vectorized operations as explained in [Advanced R](https://adv-r.hadley.nz/perf-improve.html?q=vectorised#vectorise)._ We do not support vectorized operations.
     3. **Hooks** (<a id='hooks'>`hooks`</a>)\
      :red_circle: _Handle hooks like [`userhooks`](https://stat.ethz.ch/R-manual/R-devel/library/base/html/userhooks.html) and [`on.exit`](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/on.exit)._ We do not support hooks.
     4. **Precedence** (<a id='precedence'>`precedence`</a>)\
      :green_square: _Handle the precedence of operators as explained in the [Documentation](https://rdrr.io/r/base/Syntax.html)._ We handle the precedence of operators (implicitly with the parser).
     5. **Attributes** (<a id='attributes'>`attributes`</a>)
         1. **User-Defined** (<a id='user-defined'>`user-defined`</a>)\
        :red_circle: _Handle [attributes](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Attributes) like `attr`, `attributes`, ..._ We do not support attributes.
         2. **Built-In** (<a id='built-in'>`built-in`</a>)\
        :red_circle: _Handle built-in attributes like `dim`, ..._ We do not support them.
 4. **Types** (<a id='types'>`types`</a>)
     1. **Primitive** (<a id='types-primitive'>`types-primitive`</a>)\
      :red_circle: _Recognize and resolve primitive types like `numeric`, `character`, ..._ We do not support typing currently.
     2. **Non-Primitive** (<a id='types-non-primitive'>`types-non-primitive`</a>)\
      :red_circle: _Recognize and resolve non-primitive/composite types._ We do not support typing currently.
     3. **Inference** (<a id='types-inference'>`types-inference`</a>)\
      :red_circle: _Infer types from the code._ We do not support typing currently.
     4. **Coercion** (<a id='types-coercion'>`types-coercion`</a>)\
      :red_circle: _Handle coercion of types._ We do not support typing currently.
     5. **Object-Oriented Programming** (<a id='object-oriented-programming'>`object-oriented-programming`</a>)
         1. **S3** (<a id='oop-s3'>`oop-s3`</a>)\
        :red_circle: _Handle S3 classes and methods as one unit (with attributes etc.). Including Dispatch and Inheritance._ We do not support typing currently and do not handle objects of these classes "as units."\
        _https://adv-r.hadley.nz/s3.html_
         2. **S4** (<a id='oop-s4'>`oop-s4`</a>)\
        :red_circle: _Handle S4 classes and methods as one unit. Including Dispatch and Inheritance_ We do not support typing currently and do not handle objects of these classes "as units."\
        _https://adv-r.hadley.nz/s4.html_
         3. **R6** (<a id='oop-r6'>`oop-r6`</a>)\
        :red_circle: _Handle R6 classes and methods as one unit. Including Dispatch and Inheritance, as well as its Reference Semantics, Access Control, Finalizers, and Introspection._ We do not support typing currently and do not handle objects of these classes "as units."\
        _https://adv-r.hadley.nz/r6.html_
         4. **R7/S7** (<a id='r7-s7'>`r7-s7`</a>)\
        :red_circle: _Handle R7 classes and methods as one unit. Including Dispatch and Inheritance, as well as its Reference Semantics, Validators, ..._ We do not support typing currently and do not handle objects of these classes "as units."\
        _https://www.r-bloggers.com/2022/12/what-is-r7-a-new-oop-system-for-r/, https://cran.r-project.org/web/packages/S7/index.html_
 5. **Structure** (<a id='structure'>`structure`</a>)
     1. **Comments** (<a id='comments'>`comments`</a>)\
      :green_square: _Recognize comments like `# this is a comment`, ... and line-directives_
     2. **Semicolons** (<a id='semicolons'>`semicolons`</a>)\
      :green_square: _Recognize and resolve semicolons like `a; b; c`, ..._
     3. **Newlines** (<a id='newlines'>`newlines`</a>)\
      :green_square: _Recognize and resolve newlines like `a
b
c`, ..._
 6. **System, I/O, FFI, and Other Files** (<a id='system-i-o-ffi-and-other-files'>`system-i-o-ffi-and-other-files`</a>)
     1. **Sourcing External Files** (<a id='sourcing-external-files'>`sourcing-external-files`</a>)\
      :large_orange_diamond: _Handle `source`, `sys.source`, ..._ We are currently working on supporting the inclusion of external files. Currently we can handle `source`.
     2. **Handling Binary Riles** (<a id='handling-binary-riles'>`handling-binary-riles`</a>)\
      :red_circle: _Handle files dumped with, e.g., [`save`](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/save), ... due to their frequent usage._ We do not support binary files.
     3. **I/O** (<a id='i-o'>`i-o`</a>)\
      :red_circle: _Handle `read.csv`, `write.csv`, ..._ We do not support I/O for the time being but treat them as unknown function calls.
     4. **Foreign Function Interface** (<a id='foreign-function-interface'>`foreign-function-interface`</a>)\
      :red_circle: _Handle `.Fortran`, `C`,..._ We do not support FFI but treat them as unknown function calls.
     5. **System Calls** (<a id='system-calls'>`system-calls`</a>)\
      :red_circle: _Handle [`system`](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/system), `system.*`, ..._ We do not support system calls but treat them as unknown function calls.
 7. **Pre-Processors/external Tooling** (<a id='pre-processors-external-tooling'>`pre-processors-external-tooling`</a>)\
    :red_circle: _Handle pre-processors like `knitr`, `rmarkdown`, `roxygen2` ..._ We do not support pre-processors for the time being (being unable to handle things like `@importFrom`)
