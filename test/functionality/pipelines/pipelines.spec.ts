import { requireAllTestsInFolder } from '../_helper/collect-tests'
import path from 'path'

describe('Pipelines', () => {
	describe('create', () => requireAllTestsInFolder(path.join(__dirname, 'create')))
})
