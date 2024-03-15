import { requireAllTestsInFolder } from '../_helper/collect-tests'
import path from 'node:path'

describe('Pipelines', () => {
	describe('create', () => requireAllTestsInFolder(path.join(__dirname, 'create')))
})
