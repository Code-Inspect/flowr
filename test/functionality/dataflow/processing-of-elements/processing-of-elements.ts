import { requireAllTestsInFolder } from '../../_helper/collect-tests'
import path from 'path'

describe('Processing of Elements', () => {
	describe('Atomic', () =>
		requireAllTestsInFolder(path.join(__dirname, 'atomic'))
	)

	describe('Expression Lists', () =>
		requireAllTestsInFolder(path.join(__dirname, 'expression-lists'))
	)

	describe('Functions', () =>
		requireAllTestsInFolder(path.join(__dirname, 'functions'))
	)

	describe('Loops', () =>
		requireAllTestsInFolder(path.join(__dirname, 'loops'))
	)

	describe('Multiple Files', () =>
		requireAllTestsInFolder(path.join(__dirname, 'multiple-files'))
	)
})
