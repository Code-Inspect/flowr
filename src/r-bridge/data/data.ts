import type { FlowrCapabilities } from './types'

export const flowrCapabilities = {
	name:         'Capabilities of flowR',
	description:  'This is an evolving representation of what started with #636 to formulate capabilities in a structured format.',
	version:      '0.0.1',
	capabilities: [
		{
			name:         'Names and Identifiers',
			id:           'names-and-identifiers',
			capabilities: [
				{
					name:         'Form',
					id:           'form',
					capabilities: [
						{
							name:        'Normal',
							id:          'name-normal',
							supported:   'fully',
							description: '_Recognize constructs like `a`, `plot`, ..._'
						},
						{
							name:        'Quoted',
							id:          'name-quoted',
							supported:   'fully',
							description: "_Recognize `\"a\"`, `'plot'`, ..._"
						},
						{
							name:        'Escaped',
							id:          'name-escaped',
							supported:   'fully',
							description: '_Recognize `` `a` ``, `` `plot` ``, ..._'
						}
					]
				},
				{
					name:         'Resolution',
					id:           'resolution',
					capabilities: [
						{
							name:        'Global Scope',
							id:          'global-scope',
							supported:   'fully',
							description: '_For example, tracking a big table of current identifier bindings_'
						},
						{
							name:        'Lexicographic Scope',
							id:          'lexicographic-scope',
							supported:   'fully',
							description: '_For example, support function definition scopes_'
						},
						{
							name:        'Closures',
							id:          'closures',
							supported:   'partially',
							description: '_Handling [function factories](https://adv-r.hadley.nz/function-factories.html) and friends._ Currently, we do not have enough tests to be sure.'
						},
						{
							name:        'Dynamic Environment Resolution',
							id:          'dynamic-environment-resolution',
							supported:   'not',
							description: '_For example, using `new.env` and friends_'
						},
						{
							name:        'Environment Sharing',
							id:          'environment-sharing',
							supported:   'not',
							description: '_Handling side-effects by environments which are not copied when modified_'
						},
						{
							name:        'Search Path',
							id:          'search-path',
							supported:   'not',
							description: "_Handling [R's search path](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Search-path) as explained in [Advanced R](https://adv-r.hadley.nz/environments.html#search-path)._ Currently, _flowR_ does not support dynamic modifications with `attach`, `search`, or `fn_env` and tests are definitely missing. Yet, theoretically, the tooling is all there."
						},
						{
							name:        'Namespaces',
							id:          'namespaces',
							supported:   'not',
							description: "_Handling R's namespaces as explained in [Advanced R](https://adv-r.hadley.nz/environments.html#namespaces)_"
						},
						{
							name:        'Accessing Exported Names',
							id:          'accessing-exported-names',
							supported:   'partially',
							description: '_Resolving calls with `::` to their origin._ Accessing external files is allowed, although the name of packages etc. is not resolved correctly.'
						},
						{
							name:        'Accessing Internal Names',
							id:          'accessing-internal-names',
							supported:   'not',
							description: '_Similar to `::` but for internal names._'
						},
						{
							name:        'Library Loading',
							id:          'library-loading',
							supported:   'not',
							description: '_Resolve libraries identified with `library`, `require`, `attachNamespace`, ... and attach them to the search path_'
						}
					]
				}
			]
		},
		{
			name:         'Expressions',
			id:           'expressions',
			capabilities: [
				{
					name:         'Function Calls',
					id:           'function-calls',
					capabilities: [
						{
							name:        'Grouping',
							id:          'grouping',
							supported:   'fully',
							description: '_Recognize groups done with `(`, `{`, ... (more precisely, their default mapping to the primitive implementations)._'
						},
						{
							name:         'Normal Call',
							id:           'call-normal',
							supported:    'fully',
							description:  '_Recognize and resolve calls like `f(x)`, `foo::bar(x, y)`, ..._',
							capabilities: [
								{
									name:        'Unnamed Arguments',
									id:          'unnamed-arguments',
									supported:   'fully',
									description: '_Recognize and resolve calls like `f(3)`, `foo::bar(3, c(1,2))`, ..._'
								},
								{
									name:        'Empty Arguments',
									id:          'empty-arguments',
									supported:   'fully',
									description: '_Essentially a special form of an unnamed argument as in `foo::bar(3, ,42)`, ..._'
								},
								{
									name:        'Named Arguments',
									id:          'named-arguments',
									supported:   'fully',
									description: '_Recognize and resolve calls like `f(x = 3)`, `foo::bar(x = 3, y = 4)`, ..._'
								},
								{
									name:        'String Arguments',
									id:          'string-arguments',
									supported:   'fully',
									description: '_Recognize and resolve calls like `f(\'x\' = 3)`, `foo::bar(\'x\' = 3, "y" = 4)`, ..._'
								},
								{
									name:        'Resolve Arguments',
									id:          'resolve-arguments',
									supported:   'partially',
									description: '_Correctly bind arguments (including [`pmatch`](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/pmatch))._ Currently, we do not have a correct implementation for `pmatch`. Furthermore, more tests would be nice.'
								},
								{
									name:        'Side-Effects in Argument',
									id:          'side-effects-in-argument',
									supported:   'partially',
									description: '_Handle side-effects of arguments (e.g., `f(x <- 3)`, `f(x = y <- 3)`, ...)._ We have not enough tests to be sure'
								},
								{
									name:        'Side-Effects in Function Call',
									id:          'side-effects-in-function-call',
									supported:   'partially',
									description: '_Handle side-effects of function calls (e.g., `setXTo(3)`, ...) for example achieved with the super assignment._ We need more tests and handlings. Furthermore, we do not detect side effects with external files, network, logging, etc.'
								}
							]
						},
						{
							name:        'Anonymous Calls',
							id:          'call-anonymous',
							supported:   'fully',
							description: '_Recognize and resolve calls like `(function(x) x)(3)`, `factory(0)()`, ..._'
						},
						{
							name:        'Infix Calls',
							id:          'infix-calls',
							supported:   'fully',
							description: '_Recognize and resolve calls like `x + y`, `x %>% f(y)`, ..._'
						},
						{
							name:        'Redefinition of Built-In Functions/primitives',
							id:          'redefinition-of-built-in-functions-primitives',
							supported:   'partially',
							description: '_Handle cases like `print <- function(x) x`, `` `for` <- function(a,b,c) a``, ..._ Currently, we can not handle all of them there are no tests. Still wip as part of desugaring'
						},
						{
							name:         'Index Access',
							id:           'index-access',
							capabilities: [
								{
									name:        'Single Bracket Access',
									id:          'single-bracket-access',
									supported:   'fully',
									description: '_Detect calls like `x[i]`, `x[i, ,b]`, `x[3][y]`, ... This does not include the real separation of cells, which is handled extra._'
								},
								{
									name:        'Double Bracket Access',
									id:          'double-bracket-access',
									supported:   'fully',
									description: '_Detect calls like `x[[i]]`, `x[[i, b]]`, ... Similar to single bracket._'
								},
								{
									name:        'Dollar Access',
									id:          'dollar-access',
									supported:   'fully',
									description: '_Detect calls like `x$y`, `x$"y"`, `x$y$z`, ..._'
								},
								{
									name:        'Slot Access',
									id:          'slot-access',
									supported:   'fully',
									description: '_Detect calls like `x@y`, `x@y@z`, ..._'
								},
								{
									name:        'Access with Argument-Names',
									id:          'access-with-argument-names',
									supported:   'fully',
									description: '_Detect calls like `x[i = 3]`, `x[[i=]]`, ..._'
								},
								{
									name:        'Access with Empty',
									id:          'access-with-empty',
									supported:   'fully',
									description: '_Detect calls like `x[]`, `x[2,,42]`, ..._'
								},
								{
									name:        'Subsetting',
									id:          'subsetting',
									supported:   'fully',
									description: '_Detect calls like `x[i > 3]`, `x[c(1,3)]`, ..._'
								}
							]
						},
						{
							name:         'Operators',
							id:           'operators',
							capabilities: [
								{
									name:        'Unary Operator',
									id:          'unary-operator',
									supported:   'fully',
									description: '_Recognize and resolve calls like `+3`, `-3`, ..._'
								},
								{
									name:         'Binary Operator',
									id:           'binary-operator',
									supported:    'fully',
									description:  '_Recognize and resolve calls like `3 + 4`, `3 * 4`, ..._',
									capabilities: [
										{
											name:        'Special Operator',
											id:          'special-operator',
											supported:   'fully',
											description: '_Recognize and resolve calls like `3 %in% 4`, `3 %*% 4`, ..._'
										},
										{
											name:        'Model Formula',
											id:          'model-formula',
											supported:   'partially',
											description: '_Recognize and resolve calls like `y ~ x`, `y ~ x + z`, ... including their implicit redefinitions of some functions._ Currently, we do not handle their redefinition and only treat model formulas as normal binary operators'
										},
										{
											name:         'Assignments and Bindings',
											id:           'assignments-and-bindings',
											capabilities: [
												{
													name:        'Local Left Assignment',
													id:          'local-left-assignment',
													supported:   'fully',
													description: '_Handle `x <- 3`, `x$y <- 3`, ..._'
												},
												{
													name:        'Local Right Assignment',
													id:          'local-right-assignment',
													supported:   'fully',
													description: '_Handle `3 -> x`, `3 -> x$y`, ..._'
												},
												{
													name:        'Local Equal Assignment',
													id:          'local-equal-assignment',
													supported:   'fully',
													description: '_Handle `x = 3`, `x$y := 3`, ..._'
												},
												{
													name:        'Super Left Assignment',
													id:          'super-left-assignment',
													supported:   'fully',
													description: '_Handle `x <<- 42`, `x$y <<- 42`, ..._'
												},
												{
													name:        'Super Right Assignment',
													id:          'super-right-assignment',
													supported:   'fully',
													description: '_Handle `42 ->> x`, `42 ->> x$y`, ..._'
												},
												{
													name:        'Return Value of Assignments',
													id:          'return-value-of-assignments',
													supported:   'fully',
													description: '_Handle `x <- 3` returning `3`, e.g., in `x <- y <- 3`_'
												},
												{
													name:        'Assignment Functions',
													id:          'assignment-functions',
													supported:   'partially',
													description: '_Handle `assign(x, 3)`, `delayedAssign(x, 3)`, ..._ Currently we can not handle all of them and tests are rare.'
												},
												{
													name:        'Range Assignment',
													id:          'range-assignment',
													supported:   'fully',
													description: '_Handle `x[1:3] <- 3`, `x$y[1:3] <- 3`, ..._'
												},
												{
													name:        'Replacement Functions',
													id:          'replacement-functions',
													supported:   'partially',
													description: '_Handle `x[i] <- 3`, `x$y <- 3`, ... as `` `[<-`(x, 3) ``, ..._ Currently work in progress as part of the desugaring but still untested.'
												},
												{
													name:        'Locked Bindings',
													id:          'locked-bindings',
													supported:   'not',
													description: '_Handle `lockBinding(x, 3)`, ..._'
												}
											]
										}
									]
								}
							]
						},
						{
							name:         'Control-Flow',
							id:           'control-flow',
							capabilities: [
								{
									name:        'if',
									id:          'if',
									supported:   'fully',
									description: '_Handle `if (x) y else z`, `if (x) y`, ..._'
								},
								{
									name:        'for loop',
									id:          'for-loop',
									supported:   'fully',
									description: '_Handle `for (i in 1:3) print(i)`, ..._'
								},
								{
									name:        'while loop',
									id:          'while-loop',
									supported:   'fully',
									description: '_Handle `while (x) b`, ..._'
								},
								{
									name:        'repeat loop',
									id:          'repeat-loop',
									supported:   'fully',
									description: '_Handle `repeat {b; if (x) break}`, ..._'
								},
								{
									name:        'break',
									id:          'break',
									supported:   'fully',
									description: '_Handle `break` (including `break()`) ..._'
								},
								{
									name:        'next',
									id:          'next',
									supported:   'fully',
									description: '_Handle `next` (including `next()`) ..._'
								},
								{
									name:        'switch',
									id:          'switch',
									supported:   'fully',
									description: '_Handle `switch(3, "a", "b", "c")`, ..._'
								},
								{
									name:        'return',
									id:          'return',
									supported:   'fully',
									description: '_Handle `return(3)`, ... in function definitions_'
								},
								{
									name:        'exceptions',
									id:          'exceptions',
									supported:   'not',
									description: '_Handle `try`, `stop`, ..._'
								}
							]
						},
						{
							name:         'Function Definitions',
							id:           'function-definitions',
							capabilities: [
								{
									name:        'Normal',
									id:          'normal-definition',
									supported:   'fully',
									description: '_Handle `function() 3`, ..._'
								},
								{
									name:         'Formals',
									id:           'formals',
									capabilities: [
										{
											name:        'Named',
											id:          'formals-named',
											supported:   'fully',
											description: '_Handle `function(x) x`, ..._'
										},
										{
											name:        'Default',
											id:          'formals-default',
											supported:   'fully',
											description: '_Handle `function(x = 3) x`, ..._'
										},
										{
											name:        'Dot-Dot-Dot',
											id:          'formals-dot-dot-dot',
											supported:   'fully',
											description: '_Handle `function(...) 3`, ..._'
										},
										{
											name:        'Promises',
											id:          'formals-promises',
											supported:   'partially',
											description: '_Handle `function(x = y) { y <- 3; x }`, `function(x = { x <- 3; x}) { x * x }`, ..._ We _try_ to identify promises correctly but this is really rudimentary.'
										}
									]
								},
								{
									name:        'Implicit Return',
									id:          'implicit-return',
									supported:   'fully',
									description: '_Handle the return of `function() 3`, ..._'
								},
								{
									name:        'Lambda Syntax',
									id:          'lambda-syntax',
									supported:   'fully',
									description: '_Support `\\(x) x`, ..._'
								}
							]
						},
						{
							name:         'Important Built-Ins',
							id:           'important-built-ins',
							capabilities: [
								{
									name:        'Non-Strict Logical Operators',
									id:          'non-strict-logical-operators',
									supported:   'fully',
									description: '_Handle `&&`, `||`, ..._'
								},
								{
									name:        'Pipe and Pipe-Bind',
									id:          'built-in-pipe-and-pipe-bind',
									supported:   'partially',
									description: '_Handle the [new (4.1) pipe and pipe-bind syntax](https://www.r-bloggers.com/2021/05/the-new-r-pipe/): `|>`, and `=>`._ We have not enough tests and do not support pipe-bind.'
								},
								{
									name:        'Sequencing',
									id:          'built-in-sequencing',
									supported:   'not',
									description: '_Handle `:`, `seq`, ... by gathering value information using abstract interpretation._'
								},
								{
									name:        'Internal and Primitive Functions',
									id:          'built-in-internal-and-primitive-functions',
									supported:   'not',
									description: '_Handle `.Internal`, `.Primitive`, ..._ In general we can not handle them as they refer to non-R code. We currently do not support them when used with the function.'
								},
								{
									name:        'Options',
									id:          'built-in-options',
									supported:   'not',
									description: '_Handle `options`, `getOption`, ..._ Currently, we do not support the function at all.'
								},
								{
									name:        'Help',
									id:          'built-in-help',
									supported:   'partially',
									description: '_Handle `help`, `?`, ..._ We do not support the function in a sensible way but just ignore it (although this does not happen resolved).'
								},
								{
									name:         'Reflection / "Computing on the Language"',
									id:           'reflection-"computing-on-the-language"',
									capabilities: [
										{
											name:        'Get Function Structure',
											id:          'get-function-structure',
											supported:   'not',
											description: '_Handle `body`, `formals`, `environment` to access the respective parts of a function._ We do not support the functions at all.'
										},
										{
											name:        'Modify Function Structure',
											id:          'modify-function-structure',
											supported:   'not',
											description: '_Handle `body<-`, `formals<-`, `environment<-` to modify the respective parts of a function._ We do not support the functions at all.'
										},
										{
											name:        'Quoting',
											id:          'built-in-quoting',
											supported:   'partially',
											description: '_Handle `quote`, `substitute`, `bquote`, ..._ We partially ignore some of them but most likely not all.'
										},
										{
											name:        'Evaluation',
											id:          'built-in-evaluation',
											supported:   'not',
											description: '_Handle `eval`, `evalq`, `eval.parent`, ..._ We do not handle them at all.'
										},
										{
											name:        'Parsing',
											id:          'built-in-parsing',
											supported:   'not',
											description: '_Handle `parse`, `deparse`, ..._ We handle them as unknown function calls, but not specifically besides that.'
										}
									]
								}
							]
						}
					]
				},
				{
					name:         'Literal Values',
					id:           'literal-values',
					capabilities: [
						{
							name:        'Numbers',
							id:          'numbers',
							supported:   'fully',
							description: '_Recognize numbers like `3`, `3.14`, `NA`, float-hex, ..._'
						},
						{
							name:         'Strings',
							id:           'strings',
							supported:    'fully',
							description:  "_Recognize strings like `\"a\"`, `'b'`, ..._",
							capabilities: [
								{
									name:        'Raw Strings',
									id:          'raw-strings',
									supported:   'fully',
									description: '_Recognize raw strings like `r"(a)"`, ..._'
								}
							]
						},
						{
							name:        'Logical',
							id:          'logical',
							supported:   'fully',
							description: '_Recognize the logicals `TRUE` and `FALSE`, ..._'
						},
						{
							name:        'NULL',
							id:          'null',
							supported:   'fully',
							description: '_Recognize `NULL`_'
						},
						{
							name:        'Inf and NaN',
							id:          'inf-and-nan',
							supported:   'fully',
							description: '_Recognize `Inf` and `NaN`_'
						}
					]
				}
			]
		},
		{
			name:         'Non-Standard Evaluations/Semantics',
			id:           'non-standard-evaluations-semantics',
			capabilities: [
				{
					name:        'Recycling',
					id:          'recycling',
					supported:   'not',
					description: '_Handle recycling of vectors as explained in [Advanced R](https://adv-r.hadley.nz/vectors-chap.html)._ We do not support recycling.'
				},
				{
					name:        'Vectorized Operator or Functions',
					id:          'vectorized-operator-or-functions',
					supported:   'not',
					description: '_Handle vectorized operations as explained in [Advanced R](https://adv-r.hadley.nz/perf-improve.html?q=vectorised#vectorise)._ We do not support vectorized operations.'
				},
				{
					name:        'Hooks',
					id:          'hooks',
					supported:   'not',
					description: '_Handle hooks like [`userhooks`](https://stat.ethz.ch/R-manual/R-devel/library/base/html/userhooks.html) and [`on.exit`](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/on.exit)._ We do not support hooks.'
				},
				{
					name:        'Precedence',
					id:          'precedence',
					supported:   'fully',
					description: '_Handle the precedence of operators as explained in the [Documentation](https://rdrr.io/r/base/Syntax.html)._ We handle the precedence of operators (implicitly with the parser).'
				},
				{
					name:         'Attributes',
					id:           'attributes',
					capabilities: [
						{
							name:        'User-Defined',
							id:          'user-defined',
							supported:   'not',
							description: '_Handle [attributes](https://cran.r-project.org/doc/manuals/r-release/R-lang.html#Attributes) like `attr`, `attributes`, ..._ We do not support attributes.'
						},
						{
							name:        'Built-In',
							id:          'built-in',
							supported:   'not',
							description: '_Handle built-in attributes like `dim`, ..._ We do not support them.'
						}
					]
				}
			]
		},
		{
			name:         'Types',
			id:           'types',
			capabilities: [
				{
					name:        'Primitive',
					id:          'types-primitive',
					supported:   'not',
					description: '_Recognize and resolve primitive types like `numeric`, `character`, ..._ We do not support typing currently.'
				},
				{
					name:        'Non-Primitive',
					id:          'types-non-primitive',
					supported:   'not',
					description: '_Recognize and resolve non-primitive/composite types._ We do not support typing currently.'
				},
				{
					name:        'Inference',
					id:          'types-inference',
					supported:   'not',
					description: '_Infer types from the code._ We do not support typing currently.'
				},
				{
					name:        'Coercion',
					id:          'types-coercion',
					supported:   'not',
					description: '_Handle coercion of types._ We do not support typing currently.'
				},
				{
					name:         'Object-Oriented Programming',
					id:           'object-oriented-programming',
					capabilities: [
						{
							name:        'S3',
							id:          'oop-s3',
							note:        'https://adv-r.hadley.nz/s3.html',
							supported:   'not',
							description: '_Handle S3 classes and methods as one unit (with attributes etc.). Including Dispatch and Inheritance._ We do not support typing currently and do not handle objects of these classes "as units."'
						},
						{
							name:        'S4',
							id:          'oop-s4',
							note:        'https://adv-r.hadley.nz/s4.html',
							supported:   'not',
							description: '_Handle S4 classes and methods as one unit. Including Dispatch and Inheritance_ We do not support typing currently and do not handle objects of these classes "as units."'
						},
						{
							name:        'R6',
							id:          'oop-r6',
							note:        'https://adv-r.hadley.nz/r6.html',
							supported:   'not',
							description: '_Handle R6 classes and methods as one unit. Including Dispatch and Inheritance, as well as its Reference Semantics, Access Control, Finalizers, and Introspection._ We do not support typing currently and do not handle objects of these classes "as units."'
						},
						{
							name:        'R7/S7',
							id:          'r7-s7',
							note:        'https://www.r-bloggers.com/2022/12/what-is-r7-a-new-oop-system-for-r/, https://cran.r-project.org/web/packages/S7/index.html',
							supported:   'not',
							description: '_Handle R7 classes and methods as one unit. Including Dispatch and Inheritance, as well as its Reference Semantics, Validators, ..._ We do not support typing currently and do not handle objects of these classes "as units."'
						}
					]
				}
			]
		},
		{
			name:         'Structure',
			id:           'structure',
			capabilities: [
				{
					name:        'Comments',
					id:          'comments',
					supported:   'fully',
					description: '_Recognize comments like `# this is a comment`, ... and line-directives_'
				},
				{
					name:        'Semicolons',
					id:          'semicolons',
					supported:   'fully',
					description: '_Recognize and resolve semicolons like `a; b; c`, ..._'
				},
				{
					name:        'Newlines',
					id:          'newlines',
					supported:   'fully',
					description: '_Recognize and resolve newlines like `a\nb\nc`, ..._'
				}
			]
		},
		{
			name:         'System, I/O, FFI, and Other Files',
			id:           'system-i-o-ffi-and-other-files',
			capabilities: [
				{
					name:        'Sourcing External Files',
					id:          'sourcing-external-files',
					supported:   'partially',
					description: '_Handle `source`, `sys.source`, ..._ We are currently working on supporting the inclusion of external files. Currently we can handle `source`.'
				},
				{
					name:        'Handling Binary Riles',
					id:          'handling-binary-riles',
					supported:   'not',
					description: '_Handle files dumped with, e.g., [`save`](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/save), ... due to their frequent usage._ We do not support binary files.'
				},
				{
					name:        'I/O',
					id:          'i-o',
					supported:   'not',
					description: '_Handle `read.csv`, `write.csv`, ..._ We do not support I/O for the time being but treat them as unknown function calls.'
				},
				{
					name:        'Foreign Function Interface',
					id:          'foreign-function-interface',
					supported:   'not',
					description: '_Handle `.Fortran`, `C`,..._ We do not support FFI but treat them as unknown function calls.'
				},
				{
					name:        'System Calls',
					id:          'system-calls',
					supported:   'not',
					description: '_Handle [`system`](https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/system), `system.*`, ..._ We do not support system calls but treat them as unknown function calls.'
				}
			]
		},
		{
			name:        'Pre-Processors/external Tooling',
			id:          'pre-processors-external-tooling',
			supported:   'not',
			description: '_Handle pre-processors like `knitr`, `rmarkdown`, `roxygen2` ..._ We do not support pre-processors for the time being (being unable to handle things like `@importFrom`)'
		}
	]
} as const satisfies FlowrCapabilities
