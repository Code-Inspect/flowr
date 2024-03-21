import type { NormalizedAst } from '../../r-bridge'
import { jsonReplacer } from '../../util/json'
import type { QuadSerializationConfiguration } from '../../util/quads'
import { serialize2quads } from '../../util/quads'
import { normalizedAstToMermaid, normalizedAstToMermaidUrl } from '../../util/mermaid'

/** Should work with larger things as well */
export function normalizedAstToJson(ast: NormalizedAst): string {
	// we never serialize the idmap, as it just duplicates the ast, additionally we now miss the full-lexeme to further safe memory
	return JSON.stringify({ ...ast.ast, idMap: undefined }, (k, v) => {
		if(k === 'fullLexeme') {
			return undefined
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return jsonReplacer(k, v)
	})
}

export function normalizedAstToQuads(ast: NormalizedAst, config: QuadSerializationConfiguration): string {
	return serialize2quads(ast.ast, config)
}

export function printNormalizedAstToMermaid(ast: NormalizedAst): string {
	return normalizedAstToMermaid(ast.ast)
}

export function printNormalizedAstToMermaidUrl(ast: NormalizedAst): string {
	return normalizedAstToMermaidUrl(ast.ast)
}
