describe('R-Bridge', () => {
	describe('R language utilities', () => {
		require('./lang/values')
	})

	require('./lang/ast/model')
	require('./sessions')
	require('./executor')
	require('./retriever')

	describe('Retrieve AST from R', () => {
		require('./lang/ast/parse-values')
		require('./lang/ast/parse-symbols')
		require('./lang/ast/parse-operations')
		require('./lang/ast/parse-assignments')
		require('./lang/ast/parse-access')
		require('./lang/ast/parse-pipes')
		require('./lang/ast/parse-expression-lists')
		require('./lang/ast/parse-constructs')
		require('./lang/ast/parse-function-call')
		require('./lang/ast/parse-function-definitions')
		require('./lang/ast/parse-snippets')
		require('./lang/ast/parse-directives')
	})
})
