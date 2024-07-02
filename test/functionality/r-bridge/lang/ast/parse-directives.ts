import { assertAst, withShell } from '../../../_helper/shell'
import { exprList } from '../../../_helper/ast-builder'
import { rangeFrom } from '../../../../../src/util/range'
import { label } from '../../../_helper/label'
import { RType } from '../../../../../src/r-bridge/lang-4.x/ast/model/type'

describe('Parse the line directive', withShell(shell => {
	assertAst(label('Simple line', ['comments']),
		shell, '#line 42 "foo.R"',
		exprList({
			type:     RType.LineDirective,
			info:     {},
			lexeme:   '#line 42 "foo.R"',
			location: rangeFrom(1, 1, 1, 16),
			line:     42,
			file:     'foo.R'
		})
	)
})
)
