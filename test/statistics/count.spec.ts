import { withShell } from '../helper/shell'
import { extract, staticRequests } from '../../src/statistics/statistics'

describe('Count structures in R-Scripts', withShell(shell => {
  it('Count the number of function calls', async() => {
    const code = `
library(CodeDepends)
require(devtools)
loadNamespace("glue")
requireNamespace("rang")
library(withr)
attachNamespace("purr")
xmlparsedata::xml_parse_data(parse(text="hello"))
lintr:::doMagic()
    `
    const result = await extract(shell,() => { /* do nothing */ },  'all',staticRequests({ request: 'text', content: code }))

    console.log(result)
    /* const result = countQueries(xml, '//SYMBOL_FUNCTION_CALL')
    assert.deepStrictEqual(result, [2], 'there are two calls to cat')
     */
  })
}))
