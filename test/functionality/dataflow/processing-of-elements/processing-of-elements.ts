import { requireAllTestsInFolder } from '../../_helper/collect-tests'
import path from 'path'

describe('Processing of Elements', () => {
	describe('atomic', () =>
		requireAllTestsInFolder(path.join(__dirname, 'atomic'))
	)

	describe('expression-lists', () =>
		requireAllTestsInFolder(path.join(__dirname, 'expression-lists'))
	)

	describe('functions', () =>
		requireAllTestsInFolder(path.join(__dirname, 'functions'))
	)

	describe('loops', () =>
		requireAllTestsInFolder(path.join(__dirname, 'loops'))
	)
})
