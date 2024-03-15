import { retrieveNormalizedAst, withShell } from '../_helper/shell'
import { decorateAst, requestFromInput, RType } from '../../../src'
import { defaultQuadIdGenerator, serialize2quads } from '../../../src/util/quads'
import { assert } from 'chai'
import { dataflowGraphToQuads } from '../../../src/core/print/dataflow-printer'
import { SteppingSlicer } from '../../../src/core/stepping-slicer'
import { UnnamedArgumentPrefix } from '../../../src/dataflow/internal/process/functions/process-argument'

describe('Quads', withShell(shell => {
	const context = 'test'
	const domain = 'https://uni-ulm.de/r-ast/'

	const compareQuadsCfg = async(code: string, expected: string) => {
		const ast = await retrieveNormalizedAst(shell, code)
		const decorated = decorateAst(ast).ast
		const serialized = serialize2quads(decorated, { context, domain, getId: defaultQuadIdGenerator() })
		assert.strictEqual(serialized.trim(), expected.trim())
	}

	it('should generate quads for the cfg', async() => {
		const idPrefix =  `${domain}${context}/`
		// ids are deterministic, so we can compare the quads
		await compareQuadsCfg('1', `
<${idPrefix}0> <${domain}type> "${RType.ExpressionList}" <${context}> .
<${idPrefix}0> <${domain}children> <${idPrefix}1> <${context}> .
<${idPrefix}1> <${domain}location> <${idPrefix}2> <${context}> .
<${idPrefix}2> <${domain}start> <${idPrefix}3> <${context}> .
<${idPrefix}3> <${domain}line> "1"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}3> <${domain}column> "1"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}2> <${domain}end> <${idPrefix}4> <${context}> .
<${idPrefix}4> <${domain}line> "1"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}4> <${domain}column> "1"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}1> <${domain}lexeme> "1" <${context}> .
<${idPrefix}1> <${domain}type> "${RType.Number}" <${context}> .
<${idPrefix}1> <${domain}content> <${idPrefix}5> <${context}> .
<${idPrefix}5> <${domain}num> "1"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
    `)
	})

	const compareQuadsDfg = async(code: string, expected: string) => {
		const info = await new SteppingSlicer({
			stepOfInterest: 'dataflow',
			request:        requestFromInput(code),
			shell
		}).allRemainingSteps()

		const serialized = dataflowGraphToQuads(info.dataflow, { context, domain, getId: defaultQuadIdGenerator() })
		assert.strictEqual(serialized.trim(), expected.trim())
	}

	it('should generate quads for the dfg', async() => {
		const idPrefix =  `${domain}${context}/`
		// ids are deterministic, so we can compare the quads
		await compareQuadsDfg('foo(x)', `
<${idPrefix}0> <${domain}rootIds> "1" <${context}> .
<${idPrefix}0> <${domain}rootIds> "2" <${context}> .
<${idPrefix}0> <${domain}rootIds> "3" <${context}> .
<${idPrefix}0> <${domain}vertices> <${idPrefix}1> <${context}> .
<${idPrefix}1> <${domain}next> <${idPrefix}2> <${context}> .
<${idPrefix}1> <${domain}tag> "use" <${context}> .
<${idPrefix}1> <${domain}id> "1" <${context}> .
<${idPrefix}1> <${domain}name> "x" <${context}> .
<${idPrefix}1> <${domain}environment> <${idPrefix}3> <${context}> .
<${idPrefix}3> <${domain}current> <${idPrefix}4> <${context}> .
<${idPrefix}3> <${domain}level> "0"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}1> <${domain}when> "always" <${context}> .
<${idPrefix}0> <${domain}vertices> <${idPrefix}2> <${context}> .
<${idPrefix}2> <${domain}next> <${idPrefix}5> <${context}> .
<${idPrefix}2> <${domain}tag> "use" <${context}> .
<${idPrefix}2> <${domain}id> "2" <${context}> .
<${idPrefix}2> <${domain}name> "${UnnamedArgumentPrefix}2" <${context}> .
<${idPrefix}2> <${domain}environment> <${idPrefix}6> <${context}> .
<${idPrefix}6> <${domain}current> <${idPrefix}7> <${context}> .
<${idPrefix}6> <${domain}level> "0"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}2> <${domain}when> "always" <${context}> .
<${idPrefix}0> <${domain}vertices> <${idPrefix}5> <${context}> .
<${idPrefix}5> <${domain}tag> "function-call" <${context}> .
<${idPrefix}5> <${domain}id> "3" <${context}> .
<${idPrefix}5> <${domain}name> "foo" <${context}> .
<${idPrefix}5> <${domain}environment> <${idPrefix}8> <${context}> .
<${idPrefix}8> <${domain}current> <${idPrefix}9> <${context}> .
<${idPrefix}8> <${domain}level> "0"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}5> <${domain}when> "always" <${context}> .
<${idPrefix}5> <${domain}args> <${idPrefix}10> <${context}> .
<${idPrefix}10> <${domain}name> "${UnnamedArgumentPrefix}2" <${context}> .
<${idPrefix}10> <${domain}nodeId> "2" <${context}> .
<${idPrefix}10> <${domain}used> "always" <${context}> .
<${idPrefix}0> <${domain}edges> <${idPrefix}11> <${context}> .
<${idPrefix}11> <${domain}next> <${idPrefix}12> <${context}> .
<${idPrefix}11> <${domain}from> "2" <${context}> .
<${idPrefix}11> <${domain}to> "1" <${context}> .
<${idPrefix}11> <${domain}type> "reads" <${context}> .
<${idPrefix}11> <${domain}when> "always" <${context}> .
<${idPrefix}0> <${domain}edges> <${idPrefix}12> <${context}> .
<${idPrefix}12> <${domain}from> "3" <${context}> .
<${idPrefix}12> <${domain}to> "2" <${context}> .
<${idPrefix}12> <${domain}type> "argument" <${context}> .
<${idPrefix}12> <${domain}when> "always" <${context}> .
    `)
	})
}))
