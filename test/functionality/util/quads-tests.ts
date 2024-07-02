import { retrieveNormalizedAst, withShell } from '../_helper/shell'
import { defaultQuadIdGenerator, serialize2quads } from '../../../src/util/quads'
import { assert } from 'chai'
import { dataflowGraphToQuads } from '../../../src/core/print/dataflow-printer'
import { PipelineExecutor } from '../../../src/core/pipeline-executor'
import { decorateAst } from '../../../src/r-bridge/lang-4.x/ast/model/processing/decorate'
import { requestFromInput } from '../../../src/r-bridge/retriever'
import { DEFAULT_DATAFLOW_PIPELINE } from '../../../src/core/steps/pipeline/default-pipelines'

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
<${idPrefix}0> <${domain}type> "RExpressionList" <${context}> .
<${idPrefix}0> <${domain}children> <${idPrefix}1> <${context}> .
<${idPrefix}1> <${domain}location> "1"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}1> <${domain}location> "1"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}1> <${domain}location> "1"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}1> <${domain}location> "1"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}1> <${domain}lexeme> "1" <${context}> .
<${idPrefix}1> <${domain}type> "RNumber" <${context}> .
<${idPrefix}1> <${domain}content> <${idPrefix}2> <${context}> .
<${idPrefix}2> <${domain}num> "1"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
    `)
	})

	const compareQuadsDfg = async(code: string, expected: string) => {
		const info = await new PipelineExecutor(DEFAULT_DATAFLOW_PIPELINE, {
			request: requestFromInput(code),
			shell
		}).allRemainingSteps()

		const serialized = dataflowGraphToQuads(info.dataflow, { context, domain, getId: defaultQuadIdGenerator() })
		assert.strictEqual(serialized.trim(), expected.trim())
	}

	it('should generate quads for the dfg', async() => {
		const idPrefix =  `${domain}${context}/`
		// ids are deterministic, so we can compare the quads
		await compareQuadsDfg('foo(x)', `
<${idPrefix}0> <${domain}rootIds> "1"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}0> <${domain}rootIds> "3"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}0> <${domain}vertices> <${idPrefix}1> <${context}> .
<${idPrefix}1> <${domain}next> <${idPrefix}2> <${context}> .
<${idPrefix}1> <${domain}tag> "use" <${context}> .
<${idPrefix}1> <${domain}id> "1"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}0> <${domain}vertices> <${idPrefix}2> <${context}> .
<${idPrefix}2> <${domain}tag> "function-call" <${context}> .
<${idPrefix}2> <${domain}id> "3"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}2> <${domain}environment> <${idPrefix}3> <${context}> .
<${idPrefix}3> <${domain}current> <${idPrefix}4> <${context}> .
<${idPrefix}3> <${domain}level> "0"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}2> <${domain}name> "foo" <${context}> .
<${idPrefix}2> <${domain}onlyBuiltin> "false"^^<http://www.w3.org/2001/XMLSchema#boolean> <${context}> .
<${idPrefix}2> <${domain}args> <${idPrefix}5> <${context}> .
<${idPrefix}5> <${domain}nodeId> "1"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}0> <${domain}edges> <${idPrefix}6> <${context}> .
<${idPrefix}6> <${domain}from> "3"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}6> <${domain}to> "1"^^<http://www.w3.org/2001/XMLSchema#integer> <${context}> .
<${idPrefix}6> <${domain}type> "argument" <${context}> .
    `)
	})
}))
