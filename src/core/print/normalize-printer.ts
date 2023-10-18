import { NormalizedAst } from '../../r-bridge'
import { jsonReplacer } from '../../util/json'
import { QuadSerializationConfiguration, serialize2quads } from '../../util/quads'

/** Should work with larger things as well */
// eslint-disable-next-line @typescript-eslint/require-await
export async function normalizedAstToJson(ast: NormalizedAst): Promise<string> {
	// we never serialize the idmap, as it just duplicates the ast, additionally we now miss the full-lexeme to further safe memory
	return JSON.stringify({ ...ast.ast, idMap: undefined }, (k, v) => {
		if(k === 'fullLexeme') {
			return undefined
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return jsonReplacer(k, v)
	})
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function normalizedAstToQuads(ast: NormalizedAst, config: QuadSerializationConfiguration): Promise<string> {
	return serialize2quads(ast.ast, config)
}
