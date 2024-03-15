import type { QuadSerializationConfiguration } from '../../util/quads'
import { serialize2quads } from '../../util/quads'
import type { XmlBasedJson } from '../../r-bridge'
import { convertPreparedParsedData } from '../../r-bridge/lang-4.x/ast/parser/json/parser'
import { prepareParsedData } from '../../r-bridge/lang-4.x/ast/parser/json/format'
import { attributesKey, childrenKey, contentKey } from '../../r-bridge/lang-4.x/ast/parser/xml'

function filterObject(obj: XmlBasedJson, keys: Set<string>): XmlBasedJson[] | XmlBasedJson {
	if(typeof obj !== 'object') {
		return obj
	} else if(Array.isArray(obj)) {
		return obj.map(e => filterObject(e as XmlBasedJson, keys) as XmlBasedJson)
	}
	if(Object.keys(obj).some(k => keys.has(k))) {
		return Object.fromEntries(
			Object.entries(obj)
				.filter(([k]) => keys.has(k))
				.map(([k, v]) => [k, filterObject(v as XmlBasedJson, keys)])
		)
	} else {
		return Object.fromEntries(
			Object.entries(obj)
				.map(([k, v]) => [k, filterObject(v as XmlBasedJson, keys)])
		)
	}

}

export function parseToQuads(code: string, config: QuadSerializationConfiguration): string{
	const obj = convertPreparedParsedData(prepareParsedData(code))
	// recursively filter so that if the object contains one of the keys 'a', 'b' or 'c', all other keys are ignored
	return serialize2quads(
		filterObject(obj, new Set([attributesKey, childrenKey, contentKey])) as XmlBasedJson,
		config
	)
}
