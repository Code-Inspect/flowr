import type { RNodeWithParent } from '../../r-bridge'
import { RoleInParent, visitAst } from '../../r-bridge'
import { escapeMarkdown, mermaidCodeToUrl } from './mermaid'

export function normalizedAstToMermaid(ast: RNodeWithParent, prefix = ''): string {
	let output = prefix + 'flowchart TD\n'
	visitAst(ast, n => {
		const name = `${n.type} (${n.info.id})\\n${n.lexeme ?? ' '}`
		output += `    n${n.info.id}(["${escapeMarkdown(name)}"])\n`
		if(n.info.parent !== undefined) {
			const context = n.info
			const roleSuffix = context.role === RoleInParent.ExpressionListChild || context.role === RoleInParent.FunctionCallArgument || context.role === RoleInParent.FunctionDefinitionParameter ? `-${context.index}` : ''
			output += `    n${n.info.parent} -->|"${context.role}${roleSuffix}"| n${n.info.id}\n`
		}
		return false
	})
	return output
}

/**
 * Use mermaid to visualize the normalized AST.
 */
export function normalizedAstToMermaidUrl(ast: RNodeWithParent, prefix = ''): string {
	return mermaidCodeToUrl(normalizedAstToMermaid(ast, prefix))
}
