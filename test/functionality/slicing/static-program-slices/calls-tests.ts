import { assertSliced, withShell } from '../../_helper/shell'
import { label } from '../../_helper/label'
import { OperatorDatabase } from '../../../../src/r-bridge/lang-4.x/ast/model/operators'
import type { SupportedFlowrCapabilityId } from '../../../../src/r-bridge/data/get'
import { MIN_VERSION_LAMBDA } from '../../../../src/r-bridge/lang-4.x/ast/model/versions'

describe('Calls', withShell(shell => {
	describe('Simple Calls', () => {
		const code = `i <- 4
a <- function(x) { x }
a(i)`
		for(const criterion of ['3:1', '3@a'] as const) {
			assertSliced(label(JSON.stringify(code), ['function-definitions', 'resolve-arguments', 'formals-named', 'name-normal', 'call-normal', ...OperatorDatabase['<-'].capabilities, 'unnamed-arguments']),
				shell, code, [criterion], code
			)
		}
		const constCapabilities: SupportedFlowrCapabilityId[] = ['function-definitions', 'resolve-arguments', 'formals-named', 'name-normal', 'numbers', 'call-normal', ...OperatorDatabase['<-'].capabilities, 'unnamed-arguments', 'implicit-return']
		const constFunction = `i <- 4
a <- function(x) { x <- 2; 1 }
a(i)`
		/* actually, `i` does not have to be defined, as it is _not used_ by the function, so we do not have to include `i <- 4` */
		assertSliced(label('Function call with constant function', constCapabilities),
			shell, constFunction, ['3:1'], `a <- function(x) { 1 }
a(i)`)
		/* nothing of the function-content is required */
		assertSliced(label('Slice function definition', constCapabilities),
			shell, constFunction, ['2@a'], 'a <- function(x) { }')
		assertSliced(label('Slice within function', constCapabilities), shell, constFunction, ['2:20'], 'x <- 2')
		assertSliced(label('Multiple unknown calls', ['name-normal', 'resolve-arguments','unnamed-arguments', 'numbers', 'call-normal', 'newlines']),
			shell, `
foo(x, y)
foo(x, 3)
    `, ['3@foo'], 'foo(x, 3)')
		assertSliced(label('Multiple unknown calls sharing known def', ['name-normal', 'resolve-arguments','formals-named', 'unnamed-arguments', 'implicit-return', 'numbers', 'call-normal', 'newlines']),
			shell, `
x. <- function (x) { x }
foo(x, x.(y))
foo(x, x.(3))
    `, ['4@foo'], `x. <- function(x) { x }
foo(x, x.(3))`)
		assertSliced(label('Using ...', ['name-normal', 'resolve-arguments', 'unnamed-arguments', 'formals-dot-dot-dot', 'formals-named', 'implicit-return', 'call-normal', ...OperatorDatabase['<-'].capabilities, 'newlines', 'numbers']),
			shell, `
f1 <- function (a,b) { WW }
f2 <- function (...) { f1(...) }
x <- 3
WW <- 4
y <- 3
f2(1,x)
    `, ['7@f2'], `f1 <- function(a, b) { WW }
f2 <- function(...) { f1(...) }
x <- 3
WW <- 4
f2(1,x)`)
	})
	describe('Functions using environment', () => {
		describe('Read variable defined before', () => {
			const code = `i <- 4
a <- function(x) { x + i }
a(4)`
			for(const criterion of ['3:1', '3@a'] as const) {
				assertSliced(label('Must include read', ['name-normal', 'resolve-arguments', 'unnamed-arguments', 'formals-named', 'implicit-return', 'call-normal', ...OperatorDatabase['<-'].capabilities, 'newlines', 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities, 'numbers']),
					shell, code, [criterion], code)
			}
		})
		describe('Read variable defined after', () => {
			const code = `a <- function(x) { x + i }
i <- 4
a(5)`
			for(const criterion of ['3:1', '3@a'] as const) {
				assertSliced(label('Must include read', ['name-normal', 'resolve-arguments', 'unnamed-arguments', 'formals-named', 'implicit-return', 'call-normal', ...OperatorDatabase['<-'].capabilities, 'newlines', 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities, 'numbers']),
					shell, code, [criterion], code)
			}
		})
		describe('Read variable defined before and after', () => {
			const code = `i <- 3
a <- function(x) { x + i }
i <- 4
a(5)`
			for(const criterion of ['4:1', '4@a'] as const) {
				assertSliced(label('Only keep second definition', ['name-normal', 'resolve-arguments', 'unnamed-arguments', 'formals-named', 'implicit-return', 'call-normal', ...OperatorDatabase['<-'].capabilities, 'newlines', 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities, 'numbers']), shell, code, [criterion], `a <- function(x) { x + i }
i <- 4
a(5)`)
			}
		})
	})
	describe('Functions with multiple definitions', () => {
		const code = `a <- b <- function() { x }
x <- 2
a()
b()`
		const caps: SupportedFlowrCapabilityId[] = ['name-normal', 'normal-definition', 'implicit-return', 'call-normal', ...OperatorDatabase['<-'].capabilities, 'newlines', 'binary-operator', 'infix-calls', 'numbers', 'return-value-of-assignments', 'precedence']
		assertSliced(label('Include only b-definition', caps),
			shell, code, ['3@a'], `a <- b <- function() { x }
x <- 2
a()`)
		assertSliced(label('Include only b-definition', caps),
			shell, code, ['4@b'], `b <- function() { x }
x <- 2
b()`)
	})
	describe('Functions with named arguments', () => {
		const code = `a <- function(x=4) { x }
a(x = 3)`
		assertSliced(label('Must include function definition', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'formals-default', 'implicit-return', 'newlines', 'named-arguments','resolve-arguments', 'numbers']),
			shell, code, ['2@a'], code)

		assertSliced(label('Must work for same named arguments too', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'named-arguments', 'newlines']),
			shell, 'a <- 3\nb <- foo(a=a)', ['2@b'], 'a <- 3\nb <- foo(a=a)')

		assertSliced(label('Must work for same named arguments nested', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'formals-default', 'named-arguments', 'accessing-exported-names', 'implicit-return', 'newlines', 'strings']), shell, `
f <- function(some_variable="hello") {
  result <- some::other(some_variable=some_variable)
  result
}
    `, ['4@result'], `result <- some::other(some_variable=some_variable)
result`)


		const lateCode = `f <- function(a=b, m=3) { b <- 1; a; b <- 5; a + 1 }
f()
`
		assertSliced(label('Late bindings of parameter in body', ['name-normal', 'formals-promises', 'resolve-arguments', ...OperatorDatabase['<-'].capabilities, 'formals-default', 'numbers', 'implicit-return', 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities, 'call-normal', 'semicolons']),
			shell, lateCode, ['2@f'], `f <- function(a=b, m=3) {
        b <- 1
        a + 1
    }
f()`)
		const lateCodeB = `f <- function(a=b, b=3) { b <- 1; a; b <- 5; a + 1 }
f()
`
		assertSliced(label('Late bindings of parameter in parameters', ['name-normal', 'formals-promises', 'resolve-arguments', ...OperatorDatabase['<-'].capabilities, 'formals-default', 'newlines','binary-operator', 'infix-calls', 'numbers', 'call-normal', ...OperatorDatabase['+'].capabilities, 'semicolons']),
			shell, lateCodeB, ['2@f'], `f <- function(a=b, b=3) { a + 1 }
f()`)
		assertSliced(label('Parameters binding context', ['name-normal', 'formals-promises', 'resolve-arguments', ...OperatorDatabase['<-'].capabilities, 'formals-default', 'implicit-return', 'newlines', 'numbers', 'call-normal']),
			shell, `f <- function(a=y) { a }
a <- 5
y <- 3
y <- 4
f()`, ['5@f'], `f <- function(a=y) { a }
y <- 4
f()`)

		assertSliced(label('Named argument collides with variable', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'unnamed-arguments', 'named-arguments', 'newlines']), shell, 'x <- 100\nlist(123, x = 200, 234)\nprint(x)',
			['3@x'], 'x <- 100\nx')
	})
	describe('Functions with nested definitions', () => {
		describe('Simple Function pass with return', () => {
			const code = `a <- function() { a <- 2; return(function() { 1 }) }
b <- a()
b()`
			assertSliced(label('Must include outer function', ['name-normal', 'closures', ...OperatorDatabase['<-'].capabilities, 'normal-definition', 'numbers', 'return', 'implicit-return', 'call-normal', 'newlines', 'semicolons']),
				shell, code, ['2@a'], `a <- function() { return(function() { 1 }) }
a()`)
			assertSliced(label('Must include linked function', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'normal-definition', 'return', 'implicit-return', 'numbers', 'newlines', 'call-normal']),
				shell, code, ['3@b'], `a <- function() { return(function() { 1 }) }
b <- a()
b()`)
		})
		describe('Functions binding multiple scopes', () => {
			const code = `
a <- function() { x <- function() { z + y }; y <- 12; return(x) }
y <- 5
z <- 5
u <- a()
u()`
			assertSliced(label('Must include function shell', ['name-normal', 'closures', ...OperatorDatabase['<-'].capabilities, 'normal-definition', 'implicit-return', 'numbers', 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities, 'return', 'newlines', 'call-normal', 'semicolons']),
				shell, code, ['5@a'], `a <- function() {
        x <- function() { }
        return(x)
    }
a()`)
			assertSliced(label('Must include function shell on call', ['name-normal', 'closures', ...OperatorDatabase['<-'].capabilities, 'normal-definition', 'newlines', 'return', 'call-normal']), shell, code, ['6@u'], `a <- function() {
        x <- function() { z + y }
        y <- 12
        return(x)
    }
z <- 5
u <- a()
u()`)
		})
	})
	describe('Anonymous Functions', () => {
		assertSliced(label('keep anonymous', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'normal-definition', 'binary-operator', 'infix-calls', ...OperatorDatabase['-'].capabilities, 'implicit-return', 'call-anonymous', 'unnamed-arguments']),
			shell, `
x <- (function() {
  x <- 4
  x - 5
  3
 })()
cat(x)
    `, ['7@x'], `x <- (function() { 3 })()
x`)
	})
	describe('Higher-order Functions', () => {
		const code = `a <- function() { x <- 3; i }
i <- 4
b <- function(f) { i <- 5; f() }
b(a)`
		const caps: SupportedFlowrCapabilityId[] = ['name-normal', 'resolve-arguments', ...OperatorDatabase['<-'].capabilities, 'normal-definition', 'implicit-return', 'newlines', 'numbers', 'formals-named', 'call-normal', 'unnamed-arguments']
		assertSliced(label('Only i, not bound in context', caps), shell, code, ['1@i'], 'i')
		assertSliced(label('Slice of b is independent', caps), shell, code, ['3@b'], 'b <- function(f) { }')
		assertSliced(label('Slice of b-call uses function', caps), shell, code, ['4@b'], `a <- function() { i }
b <- function(f) {
        i <- 5
        f()
    }
b(a)`)
		assertSliced(label('Directly call returned function', ['name-normal', 'closures', 'resolve-arguments', ...OperatorDatabase['<-'].capabilities, 'formals-named', 'normal-definition', 'implicit-return', 'return', 'unnamed-arguments', 'newlines', 'numbers', 'call-normal']),
			shell, `m <- 12
a <- function(x) {
  b <- function() { function() { x } }
  return(b())
}
res <- a(m)()`, ['6@res'], `m <- 12
a <- function(x) {
        b <- function() { function() { x } }
        return(b())
    }
res <- a(m)()`)
		assertSliced(label('Higher order anonymous function', ['name-normal', 'resolve-arguments', 'closures', ...OperatorDatabase['<-'].capabilities, 'formals-named', 'implicit-return', 'normal-definition', 'call-anonymous', 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities, 'newlines', 'precedence']),
			shell, `a <- function(b) {
  b
}
x <- a(function() 2 + 3)() + a(function() 7)()`, ['4@x'], `a <- function(b) { b }
x <- a(function() 2 + 3)() + a(function() 7)()`)
	})
	describe('Side-Effects', () => {
		assertSliced(label('Important Side-Effect', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'normal-definition', ...OperatorDatabase['<<-'].capabilities, 'side-effects-in-function-call', 'implicit-return', 'call-normal', 'unnamed-arguments', 'newlines', 'precedence']), shell, `x <- 2
f <- function() { x <<- 3 }
f()
cat(x)
    `, ['4@x'], `f <- function() x <<- 3
f()
x`)

		assertSliced(label('Unimportant Side-Effect', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', ...OperatorDatabase['<<-'].capabilities, 'normal-definition', 'implicit-return', 'side-effects-in-function-call', 'call-normal', 'unnamed-arguments', 'newlines']), shell, `f <- function() { y <<- 3 }
f()
cat(x)
    `, ['3@x'], 'x')
		assertSliced(label('Nested Side-Effect For Last', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'normal-definition', 'newlines', 'implicit-return', 'numbers', 'call-normal', 'side-effects-in-function-call']), shell, `f <- function() {
  a <- function() { x }
  x <- 3
  a()
  x <- 2
  a()
}
b <- f()
    `, ['8@b'], `f <- function() {
        a <- function() { x }
        x <- 2
        a()
    }
b <- f()`)
		// that it contains x <- 2 is an error in the current implementation as this happens due to the 'reads' edge from the closure linking
		// however, this read edge should not apply when the call happens within the same scope
		assertSliced(label('Nested Side-Effect For First', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'normal-definition', 'implicit-return', 'numbers', 'call-normal', 'newlines', 'side-effects-in-function-call']), shell, `f <- function() {
  a <- function() { x }
  x <- 3
  b <- a()
  x <- 2
  a()
  b
}
b <- f()
    `, ['9@b'], `f <- function() {
        a <- function() { x }
        x <- 3
        b <- a()
        x <- 2
        b
    }
b <- f()`)
	})
	describe('Early return of function', () => {
		const code = `x <- (function() {
  g <- function() { y }
  y <- 5
  if(z)
  	return(g)
  y <- 3
  g
})()
res <- x()`
		assertSliced(label('Double return points', ['name-normal', 'closures', ...OperatorDatabase['<-'].capabilities, 'call-anonymous', 'normal-definition', 'implicit-return', 'numbers', 'if', 'return', 'implicit-return', 'call-normal', 'newlines']), shell, code, ['9@res'], `
x <- (function() {
        g <- function() { y }
        y <- 5
        if(z) return(g)
        y <- 3
        g
    })()
res <- x()`.trim())
	})
	describe('Recursive functions', () => {
		const code = `f <- function() { f() }
f()`
		assertSliced(label('Endless recursion', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'normal-definition', 'implicit-return', 'call-normal', 'newlines']), shell, code, ['2@f'], code)
	})
	describe('Uninteresting calls', () => {
		const code = `
a <- list(1,2,3,4)
a[3]
print(a[2])
    `
		assertSliced(label('Must include function shell', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'unnamed-arguments', 'single-bracket-access', 'newlines']), shell, code, ['3@a'], `a <- list(1,2,3,4)
a`)
	})
	describe('Global vs. local definitions', () => {
		const localCode = `
a <- function() { x = x + 5; cat(x) }
x <- 3
a()
cat(x)`
		const localCaps: SupportedFlowrCapabilityId[] = ['name-normal', 'lexicographic-scope', 'normal-definition', ...OperatorDatabase['='].capabilities, 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities, 'semicolons', 'unnamed-arguments', 'newlines', 'call-normal', 'numbers', 'precedence']
		assertSliced(label('Local redefinition has no effect', localCaps), shell, localCode, ['5@x'], `x <- 3
x`)
		assertSliced(label('Local redefinition must be kept as part of call', localCaps), shell, localCode, ['4@a'], `a <- function() {
        x = x + 5
        cat(x)
    }
x <- 3
a()`)
		const globalCode = `
a <- function() { x <<- x + 5; cat(x) }
x <- 3
a()
x`
		assertSliced(label('But the global redefinition remains', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'normal-definition', 'implicit-return', 'side-effects-in-function-call', 'return-value-of-assignments', 'newlines', 'call-normal', 'unnamed-arguments', 'precedence']), shell, globalCode, ['5@x'], `a <- function() x <<- x + 5
x <- 3
a()
x`)
		const globalCodeWithoutLocal = `
a <- function() { x <<- 5; cat(x) }
x <- 3
a()
x`
		assertSliced(label('The local assignment is only needed if the global reads', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'function-definitions', ...OperatorDatabase['<<-'].capabilities, 'numbers', 'newlines', 'call-normal', 'unnamed-arguments', 'precedence']), shell, globalCodeWithoutLocal, ['5@x'], `a <- function() x <<- 5
a()
x`)

		assertSliced(label('Must work with nested globals', ['name-normal', 'resolve-arguments', 'lexicographic-scope', ...OperatorDatabase['<-'].capabilities, 'normal-definition', 'formals-named', 'side-effects-in-function-call', 'return-value-of-assignments', 'newlines', 'numbers', 'call-normal', 'unnamed-arguments', 'precedence']),
			shell, `a <- function() { function(b) x <<- b }
y <- 5
x <- 2
a()(y)
x`, ['5@x'], `a <- function() { function(b) x <<- b }
y <- 5
a()(y)
x`)

		assertSliced(label('Must work with nested globals and known assignments not-happening', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'normal-definition', 'formals-named', 'if', 'logical', ...OperatorDatabase['<<-'].capabilities, 'return-value-of-assignments', 'resolve-arguments', 'implicit-return', 'newlines', 'call-normal', 'unnamed-arguments']),
			shell, `a <- function() { function(b) { if(FALSE) { x <<- b } } }
y <- 5
x <- 2
a()(y)
cat(x)`, ['5@x'], `x <- 2
x`)

		assertSliced(label('Must work with nested globals and maybe assignments', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'normal-definition', 'formals-named', 'if', 'call-normal', ...OperatorDatabase['>'].capabilities, 'numbers', ...OperatorDatabase['<<-'].capabilities, 'return-value-of-assignments', 'resolve-arguments', 'lexicographic-scope', 'newlines', 'unnamed-arguments', 'closures']),
			shell, `a <- function() { function(b) { if(runif() > .5) { x <<- b } } }
y <- 5
x <- 2
a()(y)
cat(x)`, ['5@x'], `a <- function() { function(b) if(runif() > .5) { x <<- b } }
y <- 5
x <- 2
a()(y)
x`)
	})
	describe('Using strings for definitions', () => {
		const code = `
'a' <- function() { x <- 3; 4 }
'a'()
a()
a <- function() { x <- 3; 5 }
'a'()
a()
\`a\`()
    `
		const caps: SupportedFlowrCapabilityId[] = ['name-quoted', 'name-escaped', ...OperatorDatabase['<-'].capabilities, 'normal-definition', 'name-normal', 'numbers', 'semicolons', 'implicit-return', 'call-normal', 'newlines', 'name-escaped']
		assertSliced(label('Must link with string/string', caps), shell, code, ['3@\'a\''], `'a' <- function() { 4 }
'a'()`)
		assertSliced(label('Must link with string/no-string', caps), shell, code, ['4@a'], `'a' <- function() { 4 }
a()`)
		assertSliced(label('Must link with no-string/string', caps), shell, code, ['6@\'a\''], `a <- function() { 5 }
'a'()`)
		// the common case:
		assertSliced(label('Must link with no-string/no-string', caps), shell, code, ['7@a'], `a <- function() { 5 }
a()`)
		assertSliced(label('Try with special backticks', caps), shell, code, ['8@`a`'], `a <- function() { 5 }
\`a\`()`)
	})
	describe('Using own infix operators', () => {
		const code = `
\`%a%\` <- function(x, y) { x + y }
\`%a%\`(3, 4)

'%b%' <- function(x, y) { x * y }
'%b%'(3, 4)

cat(3 %a% 4)
cat(4 %b% 5)
      `
		const caps: SupportedFlowrCapabilityId[] = ['name-escaped', 'resolve-arguments', 'name-quoted', 'infix-calls', 'formals-named', 'implicit-return', 'newlines', 'unnamed-arguments', 'special-operator']
		assertSliced(label('Must link with backticks', caps), shell, code, ['8:7'], `\`%a%\` <- function(x, y) { x + y }
3 %a% 4`)
		assertSliced(label('Must link with backticks', caps), shell, code, ['9:7'], `'%b%' <- function(x, y) { x * y }
4 %b% 5`)
		assertSliced(label('Must work with assigned custom pipes too', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'infix-calls', 'numbers', 'special-operator', 'precedence']),
			shell, 'a <- b %>% c %>% d', ['1@a'], 'a <- b %>% c %>% d')
	})
	describe('Using own alias infix operators', () => {
		const code = `
"%a%" <- function(x, y) { x + y }
"%a%" <- pkg::"%a%"
cat(4 %a% 5)
      `
		assertSliced(label('Must link alias but not namespace origin', ['name-quoted', ...OperatorDatabase['<-'].capabilities, 'formals-named', 'implicit-return', 'infix-calls', 'special-operator', 'accessing-exported-names', 'newlines', 'unnamed-arguments']),
			shell, code, ['4:1'], `"%a%" <- pkg::"%a%"
cat(4 %a% 5)`)
	})
	describe('Using own alias infix operators with namespace', () => {
		const code = `
pkg::"%a%" <- function(x, y) { x + y }
"%a%" <- pkg::"%a%"
cat(4 %a% 5)
      `
		assertSliced(label('must link alias with namespace', ['accessing-exported-names', 'resolve-arguments', 'name-quoted', ...OperatorDatabase['<-'].capabilities, 'formals-named', 'implicit-return', 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities, 'special-operator', 'unnamed-arguments']),
			shell, code, ['4:1'], `pkg::"%a%" <- function(x, y) { x + y }
"%a%" <- pkg::"%a%"
cat(4 %a% 5)`)
	})
	describe('Quotation', () => {
		assertSliced(label('quote does not reference variables', ['name-normal','newlines', ...OperatorDatabase['<-'].capabilities, 'built-in-quoting' ]),
			shell, 'x <- 3\ny <- quote(x)', ['2@y'], 'y <- quote(x)')
	})
	describe('Assignment and Reflection Functions', () => {
		describe('Assign', () => {
			assertSliced(label('using assign as assignment', ['name-normal', 'numbers', 'assignment-functions', 'strings', 'newlines', 'global-scope']),
				shell, 'assign("x", 42)\nx', ['2@x'],
				'assign("x", 42)\nx')
			assertSliced(label('function', ['name-normal', 'assignment-functions', 'strings', 'newlines', 'numbers', 'implicit-return', 'normal-definition']),
				shell, 'assign("a", function() 1)\na()', ['2@a'], 'assign("a", function() 1)\na()')
			assertSliced(label('conditional assign', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'if', 'lambda-syntax', 'numbers', 'call-normal', 'implicit-return', 'assignment-functions', 'strings', 'numbers']),
				shell, `a <- \\() 2
if(y) {
   assign("a", function() 1)
}
a()`, ['5@a'], `a <- \\() 2
if(y) { assign("a", function() 1) }
a()`, { minRVersion: MIN_VERSION_LAMBDA })
		})
		describe('DelayedAssign', () => {
			assertSliced(label('using delayed-assign as assignment', ['name-normal', 'numbers', 'assignment-functions', 'strings', 'newlines', 'global-scope']),
				shell, 'delayedAssign("x", 42)\nx', ['2@x'],
				'delayedAssign("x", 42)\nx')
			assertSliced(label('using delayed-assign should break reference', ['name-normal', 'numbers', 'assignment-functions', 'strings', 'newlines', 'global-scope']),
				shell, 'x <- 4\ndelayedAssign("y", x)\nx <- 5;\ny', ['4@y'],
				'delayedAssign("y", x)\ny') // note: `x <- 5` should be part of the slice!
		})
		describe('Get', () => {
			assertSliced(label('get-access should work like a symbol-access', ['name-normal', 'numbers','strings', 'newlines', ...OperatorDatabase['<-'].capabilities, 'global-scope']),
				shell, 'x <- 42\ny <- get("x")', ['2@y'],
				'x <- 42\ny <- get("x")')
			assertSliced(label('function', ['name-normal', 'strings', 'newlines', 'normal-definition', 'implicit-return', ...OperatorDatabase['<-'].capabilities]),
				shell, 'a <- function() 1\nb <- get("a")\nb()', ['3@b'], 'a <- function() 1\nb <- get("a")\nb()')
			assertSliced(label('get in function', ['name-normal', 'function-definitions', 'newlines', 'strings', 'implicit-return']),
				shell, `a <- 5
f <- function() {
  get("a")
}
f()`, ['5@f'], `a <- 5
f <- function() { get("a") }
f()`)
			assertSliced(label('get in function argument', ['name-normal', 'formals-default', 'strings', 'implicit-return', ...OperatorDatabase['<-'].capabilities, 'newlines', 'numbers']),
				shell, `a <- 5
f <- function(a = get("a")) {
  a
}
f()`, ['5@f'], `f <- function(a=get("a")) { a }
f()`)
		})
		describe('Combine get and assign', () => {
			assertSliced(label('get in assign', ['name-normal', 'numbers', ...OperatorDatabase['<-'].capabilities, 'assignment-functions', 'strings', 'unnamed-arguments', 'newlines']),
				shell, 'b <- 5\nassign("a", get("b"))\nprint(a)', ['3@a'], 'b <- 5\nassign("a", get("b"))\na')
			assertSliced(label('get-access a function call', ['name-normal', 'numbers', 'strings', 'newlines', ...OperatorDatabase['<-'].capabilities, 'global-scope', 'function-definitions', 'call-normal']),
				shell, `a <- function() 1
b <- get("a")
res <- b()`, ['3@res'], `a <- function() 1
b <- get("a")
res <- b()`)
		})
	})
	describe('Redefine built-ins', () => {
		assertSliced(label('redefining assignments should work', ['name-quoted', 'name-normal', 'precedence', 'numbers', ...OperatorDatabase['<-'].capabilities, ...OperatorDatabase['='].capabilities, 'redefinition-of-built-in-functions-primitives']),
			shell, 'x <- 1\n`<-`<-`*`\nx <- 3\ny = x', ['4@y'], 'x <- 1\ny = x')
		assertSliced(label('redefine if', ['name-escaped', ...OperatorDatabase['<-'].capabilities, 'numbers', 'formals-dot-dot-dot', 'newlines', 'unnamed-arguments']),
			shell, `\`if\` <- function(...) 2
if(1) 
   x <- 3
print(x)`, ['4@x'], 'x <- 3\nx'/*, { expectedOutput: '[1] 2' }*/)
		assertSliced(label('named argument with redefine', ['name-escaped', 'name-normal', ...OperatorDatabase['<-'].capabilities, ...OperatorDatabase['*'].capabilities, 'named-arguments', 'newlines', 'numbers']),
			shell, `x <- 2
\`<-\` <- \`*\`
x <- 3
print(y = x)`, ['4@y'], 'y=x')
		assertSliced(label('redefine in local scope', []),
			shell, `f <- function() {
   x <- 2
   \`<-\` <- \`*\`
   x <- 3
}
y <- f()
print(y)`, ['7@y'], `f <- function() {
        x <- 2
        \`<-\` <- \`*\`
        x <- 3
    }
y <- f()
y` /* the formatting here seems wild, why five spaces */, { expectedOutput: '[1] 6' })
	})
	describe('Switch', () => {
		assertSliced(label('Switch with named arguments', ['switch', ...OperatorDatabase['<-'].capabilities, 'numbers', 'strings', 'named-arguments', 'unnamed-arguments', 'switch', 'function-calls' ]),
			shell, 'x <- switch("a", a=1, b=2, c=3)', ['1@x'], 'x <- switch("a", a=1, b=2, c=3)')
	})
	describe('Failures in Practice', () => {
		/* adapted from a complex pipe in practice */
		describe('Nested Pipes', () => {
			const caps: SupportedFlowrCapabilityId[] = ['name-normal', ...OperatorDatabase['<-'].capabilities, 'double-bracket-access', 'numbers', 'infix-calls', 'binary-operator', 'call-normal', 'newlines', 'unnamed-arguments', 'precedence', 'special-operator', 'strings', ...OperatorDatabase['=='].capabilities]
			const code =`x <- fun %>%
				filter(X == "green") %>%
				dplyr::select(X, Y) %>%
				mutate(Z = 5) %>%
				distinct() %>%
				group_by(X) %>%
				# i am commento!
				summarize(Y = mean(Y)) %>%
				left_join(., ., by = "X") %>%
				ungroup() %>%
				mutate(Y = Y + 1) %>%
				filter(Y > 5)`
			assertSliced(label('Require complete pipe', caps),
				shell, code, ['1@x'], 'x <- fun %>% filter(X == "green") %>% dplyr::select(X, Y) %>% mutate(Z = 5) %>% distinct() %>% group_by(X) %>% summarize(Y = mean(Y)) %>% left_join(., ., by = "X") %>% ungroup() %>% mutate(Y = Y + 1) %>% filter(Y > 5)')
			assertSliced(label('Slice for variable in filter', caps),
				shell, code, ['2@X'], 'X')
			assertSliced(label('Slice for variable in last filter', caps),
				shell, code, ['12@Y'], 'Y')
		})
		describe('if-then-else format', () => {
			const caps: SupportedFlowrCapabilityId[] = ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'if', 'logical', 'binary-operator', 'infix-calls', 'call-normal', 'newlines', 'unnamed-arguments', 'precedence']
			const code = `x <- 3
{
if (x == 3)
{ x <- 4 
y <- 2 }
else { x <- y <- 3 }
}
print(x)	
			`
			assertSliced(label('Slice for initial x should return noting else', caps),
				shell, code, ['1@x'], 'x <- 3', {
					expectedOutput: '[1] 4'
				})
			assertSliced(label('Slice for first condition', caps),
				shell, code, ['3@x'], 'x <- 3\nx')
			assertSliced(label('Slice for last x', caps),
				shell, code, ['8@x'], `x <- 3
if(x == 3) { 
        x <- 4
        y <- 2
    } else 
{ x <- y <- 3 }
x`)
		})
	})
	describe('Closures', () => {
		assertSliced(label('closure w/ default arguments',['name-normal', ...OperatorDatabase['<-'].capabilities, 'formals-default', 'numbers', 'newlines', 'implicit-return', 'normal-definition', 'closures', 'unnamed-arguments']),
			shell, `f <- function(x = 1) {
  function() x
}
g <- f(2)
print(g())`, ['5@g'], `f <- function(x=1) { function() x }
g <- f(2)
g()`)
		assertSliced(label('nested closures w/ default arguments', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'formals-default', 'numbers', 'newlines', 'lambda-syntax', 'implicit-return', ...OperatorDatabase['+'].capabilities, 'closures', 'grouping']),
			shell, `f <- function(x = 1) {
  (\\(y = 2) function(z = 3) x + y + z)()
}
g <- f(8)
print(g())`, ['5@g'], `f <- function(x=1) { (\\(y=2) function(z=3) x + y + z)() }
g <- f(8)
g()`, { minRVersion: MIN_VERSION_LAMBDA })
		assertSliced(label('closure w/ side effects', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'normal-definition', 'newlines', 'closures', ...OperatorDatabase['<<-'].capabilities, 'side-effects-in-function-call', ...OperatorDatabase['+'].capabilities, 'numbers']),
			shell, `f <- function() {
  function() {
    x <<- x + 1
    x
  }
}
x <- 2
f()()
print(x)`, ['9@x'], `f <- function() { function() x <<- x + 1 }
x <- 2
f()()
x`)
	})
}))
