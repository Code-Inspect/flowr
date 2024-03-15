export function escapeMarkdown(text: string): string {
	return text.replaceAll(/([+*<>])/g, '\\$1').replaceAll('"', '\'\'')
}

/**
 * Converts mermaid code (potentially produced by {@link graphToMermaid}) to an url that presents the graph in the mermaid editor.
 *
 * @param code - code to convert
 */
export function mermaidCodeToUrl(code: string): string {
	const obj = {
		code,
		mermaid: {
			autoSync: true
		}
	}
	return `https://mermaid.live/edit#base64:${Buffer.from(JSON.stringify(obj)).toString('base64')}`
}
