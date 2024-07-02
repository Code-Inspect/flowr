const replacements = {
	// keep newlines
	'\\n': '\n',
	'`':   '#96;',
	'[':   '#91;',
	']':   '#93;',
	'<':   '#60;',
	'>':   '#62;',
	'*':   '#42;',
	'+':   '#43;',
	'-':   '#45;',
	'"':   '#34;',
	'\\':  '#92;',
	'_':   '#95;',
	'{':   '#123;',
	'}':   '#125;',
	'&':   '#38;'
}

export function escapeMarkdown(text: string): string {
	for(const [key, value] of Object.entries(replacements)) {
		text = text.replaceAll(key, value)
	}
	return text
}

/**
 * Converts mermaid code (potentially produced by {@link graphToMermaid}) to an url that presents the graph in the mermaid editor.
 *
 * @param code - code to convert
 */
export function mermaidCodeToUrl(code: string, edit = false): string {
	const obj = {
		code,
		mermaid: {
			autoSync: true
		}
	}
	return `https://mermaid.live/${edit ? 'edit' : 'view'}#base64:${Buffer.from(JSON.stringify(obj)).toString('base64')}`
}
