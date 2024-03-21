import { assertDataflow, withShell } from '../../../_helper/shell'
import { emptyGraph } from '../../../_helper/dataflowgraph-builder'

describe('Lists without variable references ', withShell(shell => {
	for(const b of ['1\n2\n3', '1;2;3', '{ 1 + 2 }\n{ 3 * 4 }']) {
		assertDataflow(`${JSON.stringify(b)}`, shell,
			b,
			emptyGraph()
		)
	}
}))
