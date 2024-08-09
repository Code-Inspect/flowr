import { retrieveNormalizedAst, withShell } from '../../_helper/shell'
import { assert } from 'chai'
import { normalizeIdToNumberIfPossible } from '../../../../src/r-bridge/lang-4.x/ast/model/processing/node-id'
import type { TestLabel } from '../../_helper/label'
import { label , decorateLabelContext } from '../../_helper/label'
import type { RShell } from '../../../../src/r-bridge/shell'
import { decorateAst } from '../../../../src/r-bridge/lang-4.x/ast/model/processing/decorate'
import type { SlicingCriteriaFilter } from '../../../../src/slicing/criterion/collect-all'
import { collectAllSlicingCriteria } from '../../../../src/slicing/criterion/collect-all'
import type { SlicingCriteria } from '../../../../src/slicing/criterion/parse'
import { convertAllSlicingCriteriaToIds } from '../../../../src/slicing/criterion/parse'
import type { SupportedFlowrCapabilityId } from '../../../../src/r-bridge/data/get'
import { OperatorDatabase } from '../../../../src/r-bridge/lang-4.x/ast/model/operators'
import { DefaultAllVariablesFilter } from '../../../../src/slicing/criterion/filters/all-variables'


function assertRetrievedIdsWith(shell: RShell, name: string | TestLabel, input: string, filter: SlicingCriteriaFilter, ...expected: SlicingCriteria[]) {
	return it(decorateLabelContext(name, ['slice']), async() => {
		const ast = await retrieveNormalizedAst(shell, input)
		const decorated = decorateAst(ast)
		const got = [...collectAllSlicingCriteria(decorated.ast, filter)]
			.flatMap(criteria => convertAllSlicingCriteriaToIds(criteria, decorated))
			.map(m => ({ id: normalizeIdToNumberIfPossible(m.id), name: decorated.idMap.get(normalizeIdToNumberIfPossible(m.id))?.lexeme }))
		const expectedMapped = expected
			.flatMap(criteria => convertAllSlicingCriteriaToIds(criteria, decorated))

		assert.deepStrictEqual(got, expectedMapped.map(m => ({ id: normalizeIdToNumberIfPossible(m.id), name: decorated.idMap.get(normalizeIdToNumberIfPossible(m.id))?.lexeme })), `mapped: ${JSON.stringify(expectedMapped)}`)
	})
}

describe('Retrieve all slicing locations', withShell(shell => {
	describe('Test the default all variables filter', () => {
		function test(input: string, caps: SupportedFlowrCapabilityId[], ...expected: SlicingCriteria[]) {
			assertRetrievedIdsWith(shell, label(`Retrieve all variables in ${JSON.stringify(input)}`, caps), input, DefaultAllVariablesFilter, ...expected)
		}
		test('x <- 1', [...OperatorDatabase['<-'].capabilities, 'name-normal', 'numbers'], [ '1@x' ])
		test('x <- 1\ny <- 2', [...OperatorDatabase['<-'].capabilities, 'name-normal', 'numbers', 'newlines'], [ '1@x' ], [ '2@y' ])
		test('library(foo)', ['unnamed-arguments', 'name-normal'], [ ]) // here, foo is not a variable but used as the library name
		test(`a <- 52
foo(a=3,b<-2,c=4)
if(TRUE) {
  while(a > 3) {
    a = a - 1
  }
  foo <<- function(x) {
    x + 1
  }
  a - 1 -> a
}
foo(5)`, [...OperatorDatabase['<-'].capabilities, ...OperatorDatabase['='].capabilities, ...OperatorDatabase['-'].capabilities, ...OperatorDatabase['<<-'].capabilities, ...OperatorDatabase['->'].capabilities, ...OperatorDatabase['+'].capabilities, ...OperatorDatabase['>'].capabilities, 'name-normal', 'numbers', 'newlines', 'if', 'while-loop', 'logical', 'named-arguments', 'side-effects-in-argument', 'formals-named', 'implicit-return'],
		[ '1@a' ], [ '2@b' ], [ '4@a' ], [ '5:5' ], [ '5:9' ], [ '7@foo' ], [ '8@x' ], [ '10:3' ], [ '10:12' ])
		test(`x = NULL
u <<- function(a = NULL, b = NA, c, d=7, e=x, f=TRUE, g=FALSE, ...) {
  g <- 12 * NaN - Inf
  h <- function(x) { x + 1 }
  return(h(a + b))
}`,[...OperatorDatabase['<<-'].capabilities, ...OperatorDatabase['='].capabilities, 'name-normal', 'inf-and-nan', 'numbers', 'null', 'newlines', 'formals-default', 'formals-named', 'unnamed-arguments', ...OperatorDatabase['+'].capabilities, 'implicit-return', 'return'],
		[ '1@x' ], [ '2@u' ], ['2@x'], [ '3@g' ], [ '4@h' ], [ '4:22' ], [ '5@a' ], [ '5@b' ])
	})
}))
