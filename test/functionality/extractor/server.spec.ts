import { withShell } from '../helper/shell'
import { fakeSend, withSocket } from '../helper/net'
import { retrieveVersionInformation } from '../../../src/cli/repl/commands/version'
import { ExtractorHelloResponseMessage } from '../../../src/cli/repl/server/messages/hello'
import { assert } from 'chai'
import { FileAnalysisRequestMessage, FileAnalysisResponseMessageJson } from '../../../src/cli/repl/server/messages/analysis'
import { DecoratedAstMap, ParentInformation, requestFromInput } from '../../../src/r-bridge'
import { LAST_PER_FILE_STEP, SteppingSlicer } from '../../../src/core'
import { jsonReplacer } from '../../../src/util/json'
import {
	ExecuteEndMessage,
	ExecuteIntermediateResponseMessage,
	ExecuteRequestMessage
} from '../../../src/cli/repl/server/messages/repl'
import { extractCFG } from '../../../src/util/cfg'

describe('Extractor Server', withShell(shell => {
	it('Correct Hello Message', withSocket(shell,async socket => {
		const messages = socket.getMessages()
		assert.strictEqual(messages.length, 1, 'Expected exactly one message to hello the client')

		const hello = messages[0] as ExtractorHelloResponseMessage
		const knownVersion = await retrieveVersionInformation(shell)

		assert.deepStrictEqual(hello, {
			type:       'hello',
			clientName: 'client-0',
			versions:   {
				r:     knownVersion.r,
				extractor: knownVersion.extractor
			}
		}, 'Expected hello message to have the predefined format')
	}))

	it('Process simple REPL Message', withSocket(shell, async socket => {
		fakeSend<ExecuteRequestMessage>(socket, {
			type:       'request-repl-execution',
			ansi:       false,
			id:         '0',
			expression: '1 + 1'
		})

		await socket.waitForMessage('end-repl-execution')

		const messages = socket.getMessages()

		assert.deepStrictEqual(messages[1] as ExecuteIntermediateResponseMessage, {
			type:   'response-repl-execution',
			id:     '0',
			stream: 'stdout',
			result: '[1] 2\n'
		}, 'response message should contain request id, result should be not in standard error (no failure), and it should be the correct result')

		assert.deepStrictEqual(messages[2] as ExecuteEndMessage, {
			type: 'end-repl-execution',
			id:   '0',
		}, 'the end message should have the same id as the response (and come after the response)')

	}))


	it('Allow to analyze a simple expression', withSocket(shell, async socket => {
		fakeSend<FileAnalysisRequestMessage>(socket, {
			type:      'request-file-analysis',
			id:        '42',
			filetoken: 'super-token',
			filename:  'x',
			content:   '1 + 1'
		})
		await socket.waitForMessage('response-file-analysis')
		const messages = socket.getMessages(['hello', 'response-file-analysis'])

		const response = messages[1] as FileAnalysisResponseMessageJson

		// we are testing the server and not the slicer here!
		const results = await new SteppingSlicer({
			stepOfInterest: LAST_PER_FILE_STEP,
			shell,
			request:        requestFromInput('1 + 1'),
		}).allRemainingSteps()
		// hideous
		results.normalize.idMap = undefined as unknown as DecoratedAstMap<ParentInformation>

		// cfg should not be set as we did not request it
		assert.isUndefined(response.cfg, 'Expected the cfg to be undefined as we did not request it')

		assert.strictEqual(response.id, '42', 'Expected the second message to have the same id as the request')

		// this is hideous and only to unify the ids
		const expected = JSON.stringify(results, jsonReplacer)
			.replace(/"\.GlobalEnv","id":"\d+"/g, '')
		const got = JSON.stringify(response.results, jsonReplacer)
			.replace(/"\.GlobalEnv","id":"\d+"/g, '')
		assert.strictEqual(got, expected, 'Expected the second message to have the same results as the slicer')
	}))

	it('Analyze with the CFG', withSocket(shell, async socket => {
		fakeSend<FileAnalysisRequestMessage>(socket, {
			type:      'request-file-analysis',
			id:        '42',
			filetoken: 'super-token',
			filename:  'x',
			content:   'a;b',
			cfg:       true
		})
		await socket.waitForMessage('response-file-analysis')
		const messages = socket.getMessages(['hello', 'response-file-analysis'])

		const response = messages[1] as FileAnalysisResponseMessageJson

		const gotCfg = response.cfg
		assert.isDefined(gotCfg, 'Expected the cfg to be defined as we requested it')
		const expectedCfg = extractCFG(response.results.normalize)
		assert.equal(JSON.stringify(gotCfg?.graph, jsonReplacer), JSON.stringify(expectedCfg.graph, jsonReplacer), 'Expected the cfg to be the same as the one extracted from the results')
	}))
}))
