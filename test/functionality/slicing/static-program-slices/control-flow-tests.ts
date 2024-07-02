import { assertSliced, withShell } from '../../_helper/shell'
import { label } from '../../_helper/label'
import { OperatorDatabase } from '../../../../src/r-bridge/lang-4.x/ast/model/operators'
import type { SupportedFlowrCapabilityId } from '../../../../src/r-bridge/data/get'

describe('Control flow', withShell(shell => {
	describe('Branch Coverage', () => {
		assertSliced(label('nested if', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'newlines', 'if', 'unnamed-arguments']),
			shell, `x <- 1
if(y) {
  if(z) {
    x <- 3
  } else {
    x <- 2
  }
} else {
  x <- 4
}
print(x)`, ['11@x'], `if(y) { if(z) { x <- 3 } else 
    { x <- 2 } } else 
{ x <- 4 }
x`)

		// we don't expect to be smart about loops other than repeat at the moment, see https://github.com/Code-Inspect/flowr/issues/804
		const loops: [string, SupportedFlowrCapabilityId[]][] = [
			['repeat', ['repeat-loop']],
			['while(TRUE)', ['while-loop', 'logical']],
			['for(i in 1:100)', ['for-loop', 'numbers', 'name-normal']]
		]
		for(const [loop, caps] of loops){
			describe(loop, () => {
				assertSliced(label('Break immediately', [...caps, 'name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'semicolons', 'newlines', 'break', 'unnamed-arguments']),
					shell, `x <- 1
${loop} {
   x <- 2;
   break
}
print(x)`, ['6@x'], loop == 'repeat' ? 'x <- 2\nx' : `x <- 1\n${loop} x <- 2\nx`)
				assertSliced(label('Break in condition', [...caps, 'name-normal', 'numbers', 'semicolons', 'newlines', 'break', 'unnamed-arguments', 'if']),
					shell, `x <- 1
${loop} {
   x <- 2;
   if(foo) 
      break
}
print(x)`, ['7@x'], loop == 'repeat' ? 'x <- 2\nx' :`x <- 1
${loop} {
    x <- 2
    if(foo) break
}
x`)
				assertSliced(label('Next', [...caps, 'newlines', 'name-normal', 'numbers', 'next', 'semicolons', 'unnamed-arguments']),
					shell, `x <- 1
${loop} {
   x <- 2;
   next;
   x <- 3;
}
print(x)`, ['7@x'], loop == 'repeat' ? 'x <- 2\nx' : `x <- 1\n${loop} {
    x <- 2
    x <- 3
}
x`)
			})
		}
		assertSliced(label('dead code (return)', ['name-normal', 'formals-named', 'newlines', ...OperatorDatabase['<-'].capabilities, ...OperatorDatabase['*'].capabilities, 'numbers', 'return', 'unnamed-arguments', 'comments']),
			shell, `f <- function(x) {
   x <- 3 * x
   return(x)
   # alles drunter soll natürlich weg 
   x <- 2
   return(x)
}

f(5)`, ['9@f'],`f <- function(x) {
        x <- 3 * x
        return(x)
    }
f(5)`)
		assertSliced(label('dead code (return in if)', ['name-normal', 'formals-named', 'newlines', ...OperatorDatabase['<-'].capabilities, ...OperatorDatabase['*'].capabilities, 'numbers', 'if', 'return', 'unnamed-arguments', 'comments']),
			shell, `f <- function(x) {
   x <- 3 * x
   if(k)
      return(x)
   else
      return(1)
   # alles drunter soll natürlich weg 
   x <- 2
   return(x)
}

f(5)`, ['12@f'], `f <- function(x) {
        x <- 3 * x
        if(k) return(x) else
        return(1)
    }
f(5)`)
	})
	describe('Redefinitions', () => {
		assertSliced(label('redefining {', ['name-escaped', ...OperatorDatabase['<-'].capabilities, 'formals-dot-dot-dot', 'implicit-return', 'numbers', 'newlines']),
			shell, `\`{\` <- function(...) 3
x <- 4
{
   x <- 2
   print(x)
}
print(x)`, ['7@x'], 'x <- 2\nx')
	})
}))
