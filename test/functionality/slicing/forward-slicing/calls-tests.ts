import { assertForwardSliced, withShell } from '../../_helper/shell'
import { label } from '../../_helper/label'
import { OperatorDatabase } from '../../../../src/r-bridge/lang-4.x/ast/model/operators'

describe('Calls', withShell(shell => {
	describe('Simple Calls', () => {
		assertForwardSliced(label('function call', ['function-definitions', 'resolve-arguments', 'formals-named', 'name-normal', 'call-normal', ...OperatorDatabase['<-'].capabilities, 'unnamed-arguments']),
			shell, 'i <- 4\na <- function(x) { x }\na(i)', ['1@i'], 'i <- 4\na(i)')
	})

	describe('Functions using environment', () => {
		const code = `i <- 4
a <- function(x) { x + i }
a(17)`
		assertForwardSliced(label('Must include read', ['name-normal', 'resolve-arguments', 'unnamed-arguments', 'formals-named', 'implicit-return', 'call-normal', ...OperatorDatabase['<-'].capabilities, 'newlines', 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities, 'numbers']),
			shell, code, ['1@i'], code)
	})

	describe('Redefine', () => {
		assertForwardSliced(label('Only keep first definition', ['name-normal', 'resolve-arguments', 'unnamed-arguments', 'formals-named', 'implicit-return', 'call-normal', ...OperatorDatabase['<-'].capabilities, 'newlines', 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities, 'numbers']), shell, `i <- 3
a <- function(x) { x + i }
i <- 4
a(5)`, ['1@i'], 'i <- 3')
		assertForwardSliced(label('Only keep first definition and call', ['name-normal', 'resolve-arguments', 'unnamed-arguments', 'formals-named', 'implicit-return', 'call-normal', ...OperatorDatabase['<-'].capabilities, 'newlines', 'binary-operator', 'infix-calls', ...OperatorDatabase['+'].capabilities, 'numbers']), shell, `i <- 3
a <- function(x) { x + i }
a(5)
i <- 4
a(5)`, ['1@i'], `i <- 3
a <- function(x) { x + i }
a(5)`)
	})
}))
