import { assertForwardSliced, withShell } from '../../_helper/shell'
import { label } from '../../_helper/label'

// TODO add labels to these tests
describe('Assignments', withShell(shell => {
	assertForwardSliced(label('simple value', []), shell,
		'x <- 1\nx', ['1@x'], 'x <- 1\nx')
	assertForwardSliced(label('simple value with reassignment', []), shell,
		'x <- 1\nprint(x)\nx <- 2\nx', ['1@x'], 'x <- 1\nprint(x)')

	const ifElse = `
x <- 1
if(y) {
   x <- 2
} else {
   x <- 3
}
print(x)`.trimStart()
	assertForwardSliced(label('before if/else', []), shell,
		ifElse, ['1@x'], 'x <- 1')
	assertForwardSliced(label('within if/else', []), shell,
		ifElse, ['3@x'], 'if(y) { x <- 2 }\nprint(x)')

	assertForwardSliced(label('if', []), shell,
		`
x <- 1
if(y) {
   x <- 2
}
print(x)`.trimStart(), ['1@x'], 'x <- 1\nprint(x)')

	const complexAssign = `
x <- 3
y <- x * 2
z <- y - 4
d <- 1
print(z)`.trimStart()
	assertForwardSliced(label('complex assign x', []), shell,
		complexAssign, ['1@x'], `
x <- 3
y <- x * 2
z <- y - 4
print(z)`.trimStart())
	assertForwardSliced(label('complex assign y', []), shell,
		complexAssign, ['2@y'], `
y <- x * 2
z <- y - 4
print(z)`.trimStart())
}))
