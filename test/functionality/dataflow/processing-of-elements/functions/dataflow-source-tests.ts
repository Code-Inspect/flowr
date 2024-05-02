import { EmptyArgument, requestProviderFromFile, requestProviderFromText } from '../../../../../src'
import { BuiltIn } from '../../../../../src/dataflow'
import { setSourceProvider } from '../../../../../src/dataflow/internal/process/functions/call/built-in/built-in-source'
import { emptyGraph } from '../../../_helper/dataflow/dataflowgraph-builder'
import { argumentInCall, defaultEnv } from '../../../_helper/dataflow/environment-builder'
import { assertDataflow, withShell } from '../../../_helper/shell'

describe('source', withShell(shell => {
	// reset the source provider back to the default value after our tests
	after(() => setSourceProvider(requestProviderFromFile()))

	const sources = {
		simple:     'N <- 9',
		recursive1: 'x <- 1\nsource("recursive2")',
		recursive2: 'cat(x)\nsource("recursive1")'
	}
	setSourceProvider(requestProviderFromText(sources))

	assertDataflow('simple source', shell, 'source("simple")\ncat(N)', emptyGraph()
		.use('5', 'N')
		.reads('5', 'simple-1:1-1:6-0')
		.call('3', 'source', [argumentInCall('1')], { returns: [], reads: [BuiltIn] })
		.call('simple-1:1-1:6-2', '<-', [argumentInCall('simple-1:1-1:6-0'), argumentInCall('simple-1:1-1:6-1')], { returns: ['simple-1:1-1:6-0'], reads: [BuiltIn] })
		.call('7', 'cat', [argumentInCall('5')], { returns: [], reads: [BuiltIn], environment: defaultEnv().defineVariable('N', 'simple-1:1-1:6-0', 'simple-1:1-1:6-2') })
		.constant('1')
		.constant('simple-1:1-1:6-1')
		.defineVariable('simple-1:1-1:6-0', 'N', { definedBy: ['simple-1:1-1:6-1', 'simple-1:1-1:6-2'] })
	)

	assertDataflow('multiple source', shell, 'source("simple")\nN <- 0\nsource("simple")\ncat(N)',  emptyGraph()
		.use('12', 'N')
		.reads('12', 'simple-3:1-3:6-0')
		.call('3', 'source', [argumentInCall('1')], { returns: [], reads: [BuiltIn] })
		.sameRead('3', '10')
		.call('simple-1:1-1:6-2', '<-', [argumentInCall('simple-1:1-1:6-0'), argumentInCall('simple-1:1-1:6-1')], { returns: ['simple-1:1-1:6-0'], reads: [BuiltIn] })
		.call('6', '<-', [argumentInCall('4'), argumentInCall('5')], { returns: ['4'], reads: [BuiltIn], environment: defaultEnv().defineVariable('N', 'simple-1:1-1:6-0', 'simple-1:1-1:6-2') })
		.call('10', 'source', [argumentInCall('8')], { returns: [], reads: [BuiltIn], environment: defaultEnv().defineVariable('N', '4', '6') })
		.call('simple-3:1-3:6-2', '<-', [argumentInCall('simple-3:1-3:6-0'), argumentInCall('simple-3:1-3:6-1')], { returns: ['simple-3:1-3:6-0'], reads: [BuiltIn], environment: defaultEnv().defineVariable('N', '4', '6') })
		.call('14', 'cat', [argumentInCall('12')], { returns: [], reads: [BuiltIn], environment: defaultEnv().defineVariable('N', 'simple-3:1-3:6-0', 'simple-3:1-3:6-2') })
		.constant('1')
		.constant('simple-1:1-1:6-1')
		.defineVariable('simple-1:1-1:6-0', 'N', { definedBy: ['simple-1:1-1:6-1', 'simple-1:1-1:6-2'] })
		.sameDef('simple-1:1-1:6-0', '4')
		.constant('5')
		.defineVariable('4', 'N', { definedBy: ['5', '6'] })
		.sameDef('4', 'simple-3:1-3:6-0')
		.constant('8')
		.constant('simple-3:1-3:6-1')
		.defineVariable('simple-3:1-3:6-0', 'N', { definedBy: ['simple-3:1-3:6-1', 'simple-3:1-3:6-2'] })
	)

	assertDataflow('conditional', shell, 'if (x) { source("simple") }\ncat(N)',  emptyGraph()
		.use('0', 'x')
		.use('10', 'N')
		.reads('10', 'simple-1:10-1:15-0')
		.call('6', 'source', [argumentInCall('4')], { returns: [], reads: [BuiltIn], controlDependency: ['8'] })
		.call('simple-1:10-1:15-2', '<-', [argumentInCall('simple-1:10-1:15-0'), argumentInCall('simple-1:10-1:15-1')], { returns: ['simple-1:10-1:15-0'], reads: [BuiltIn] })
		.call('7', '{', [argumentInCall('6', { controlDependency: ['8'] })], { returns: ['6'], reads: [BuiltIn], controlDependency: ['8'] })
		.call('8', 'if', [argumentInCall('0'), argumentInCall('7', { controlDependency: ['8'] }), EmptyArgument], { returns: ['7'], reads: ['0', BuiltIn], onlyBuiltIn: true })
		.call('12', 'cat', [argumentInCall('10')], { returns: [], reads: [BuiltIn], environment: defaultEnv().defineVariable('N', 'simple-1:10-1:15-0', 'simple-1:10-1:15-2') })
		.constant('4')
		.constant('simple-1:10-1:15-1')
		.defineVariable('simple-1:10-1:15-0', 'N', { definedBy: ['simple-1:10-1:15-1', 'simple-1:10-1:15-2'] })
	)

	// missing sources should just be ignored
	assertDataflow('missing source', shell, 'source("missing")', emptyGraph()
		.call('3', 'source', [argumentInCall('1')], { returns: [], reads: [BuiltIn] })
		.constant('1')
	)

	assertDataflow('recursive source', shell, sources.recursive1,  emptyGraph()
		.use('recursive2-2:1-2:6-1', 'x')
		.reads('recursive2-2:1-2:6-1', '0')
		.call('2', '<-', [argumentInCall('0'), argumentInCall('1')], { returns: ['0'], reads: [BuiltIn] })
		.call('6', 'source', [argumentInCall('4')], { returns: [], reads: [BuiltIn], environment: defaultEnv().defineVariable('x', '0', '2') })
		.call('recursive2-2:1-2:6-3', 'cat', [argumentInCall('recursive2-2:1-2:6-1')], { returns: [], reads: [BuiltIn], environment: defaultEnv().defineVariable('x', '0', '2') })
		.call('recursive2-2:1-2:6-7', 'source', [argumentInCall('recursive2-2:1-2:6-5')], { returns: [], reads: [BuiltIn], environment: defaultEnv().defineVariable('x', '0', '2') })
		.constant('1')
		.defineVariable('0', 'x', { definedBy: ['1', '2'] })
		.constant('4')
		.constant('recursive2-2:1-2:6-5')
	)

	// we currently don't support (and ignore) source calls with non-constant arguments!
	assertDataflow('non-constant source', shell, 'x <- "recursive1"\nsource(x)',  emptyGraph()
		.use('4', 'x')
		.reads('4', '0')
		.call('2', '<-', [argumentInCall('0'), argumentInCall('1')], { returns: ['0'], reads: [BuiltIn] })
		.call('6', 'source', [argumentInCall('4')], { returns: [], reads: [BuiltIn], environment: defaultEnv().defineVariable('x', '0', '2') })
		.constant('1')
		.defineVariable('0', 'x', { definedBy: ['1', '2'] })
	)
}))
