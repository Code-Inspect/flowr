import { assertSliced, withShell } from '../../_helper/shell'
import { setSourceProvider } from '../../../../src/dataflow/internal/process/functions/call/built-in/built-in-source'
import { requestProviderFromFile, requestProviderFromText } from '../../../../src/r-bridge/retriever'
import { label } from '../../_helper/label'
import { OperatorDatabase } from '../../../../src/r-bridge/lang-4.x/ast/model/operators'

describe('source', withShell(shell => {
	const sources = {
		simple:   'N <- 9',
		closure1: 'f <- function() { function() 3 }',
		closure2: 'f <- function() { x <<- 3 }'
	}
	before(() => setSourceProvider(requestProviderFromText(sources)))
	after(() => setSourceProvider(requestProviderFromFile()))

	// these are incorrect - where is the content from the sourced file? (see https://github.com/Code-Inspect/flowr/issues/822)
	assertSliced(label('simple source', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'numbers', 'unnamed-arguments', 'strings', 'sourcing-external-files','newlines']),
		shell, 'source("simple")\ncat(N)', ['2@N'], 'N')
	assertSliced(label('sourcing a closure', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'sourcing-external-files', 'newlines', 'normal-definition', 'implicit-return', 'closures', 'numbers']),
		shell, 'source("closure1")\ng <- f()\nprint(g())', ['3@g'], 'g <- f()\ng()')
	assertSliced(label('sourcing a closure w/ side effects', ['name-normal', ...OperatorDatabase['<-'].capabilities, 'sourcing-external-files', 'newlines', 'normal-definition', 'implicit-return', 'closures', 'numbers', ...OperatorDatabase['<<-'].capabilities]),
		shell, 'x <- 2\nsource("closure2")\nf()\nprint(x)', ['4@x'], 'f()\nx')
}))
