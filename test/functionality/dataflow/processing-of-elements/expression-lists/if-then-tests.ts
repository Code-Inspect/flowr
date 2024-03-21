import { assertDataflow, withShell } from '../../../_helper/shell'
import { GlobalScope, LocalScope } from '../../../../../src/dataflow/environments/scopes'
import { emptyGraph } from '../../../_helper/dataflowgraph-builder'
import { defaultEnvironment } from '../../../_helper/environment-builder'

describe('Lists with if-then constructs', withShell(shell => {
	for(const assign of [ '<-', '<<-', '=']) {
		const scope = assign === '<<-' ? GlobalScope : LocalScope
		describe(`using ${assign}`, () => {
			describe('reads within if', () => {
				for(const b of [
					{ label: 'without else', text: '' },
					{ label: 'with else', text: ' else { 1 }' },
				]) {
					describe(`${b.label}`, () => {
						assertDataflow('read previous def in cond',
							shell,
							`x ${assign} 2\nif(x) { 1 } ${b.text}`,
							emptyGraph()
								.defineVariable('0', 'x', scope)
								.use('3', 'x', { environment: defaultEnvironment().defineVariable('x', '0', '2', scope) })
								.reads('3', '0')
						)
						assertDataflow('read previous def in then',
							shell,
							`x ${assign} 2\nif(TRUE) { x } ${b.text}`,
							emptyGraph()
								.defineVariable('0', 'x', scope)
								.use('4', 'x', { environment: defaultEnvironment().defineVariable('x', '0', '2', scope) })
								.reads('4', '0')
						)
					})
				}
				assertDataflow('read previous def in else',
					shell,
					`x ${assign} 2\nif(FALSE) { 42 } else { x }`,
					emptyGraph()
						.defineVariable('0', 'x', scope)
						.use('6', 'x', { environment: defaultEnvironment().defineVariable('x', '0', '2', scope) })
						.reads('6', '0')
				)
			})
			describe('write within if', () => {
				for(const b of [
					{ label: 'without else', text: '' },
					{ label: 'with else', text: ' else { 1 }' },
				]) {
					assertDataflow(`${b.label} directly together`,
						shell,
						`if(TRUE) { x ${assign} 2 }\nx`,
						emptyGraph()
							.defineVariable('1', 'x', scope)
							.use('6', 'x', { environment: defaultEnvironment().defineVariable('x', '1', '3', scope) })
							.reads('6', '1')
					)
				}
				assertDataflow('def in else read afterwards',
					shell,
					`if(FALSE) { 42 } else { x ${assign} 5 }\nx`,
					emptyGraph()
						.defineVariable('3', 'x', scope)
						.use('8', 'x', { environment: defaultEnvironment().defineVariable('x', '3', '5', scope) })
						.reads('8', '3')
				)

				const whenEnvironment = defaultEnvironment().defineVariable('x', '1', '3', scope, 'maybe')
				const otherwiseEnvironment = defaultEnvironment().defineVariable('x', '5', '7', scope, 'maybe')

				assertDataflow('def in then and else read afterward',
					shell,
					`if(z) { x ${assign} 7 } else { x ${assign} 5 }\nx`,
					emptyGraph()
						.use('0', 'z', { scope })
						.defineVariable('1', 'x', scope,  { when: 'maybe' })
						.defineVariable('5', 'x', scope,  { when: 'maybe' })
						.use('10', 'x', { environment: whenEnvironment.appendWritesOf(otherwiseEnvironment) })
						.reads('10', '1', 'maybe')
						.reads('10', '5', 'maybe')
				)
			})
		})
	}
}))
