import { requireAllTestsInFolder } from '../_helper/collect-tests'
import path from 'path'

describe('Slicing', () => {
	describe('Reconstruct', () => {
		requireAllTestsInFolder(path.join(__dirname, 'reconstruct'))
	})
	describe('Static Program Slices', () => {
		requireAllTestsInFolder(path.join(__dirname, 'static-program-slices'))
	})
	describe('Slicing-Criterion', () => {
		requireAllTestsInFolder(path.join(__dirname, 'slicing-criterion'))
	})
})
