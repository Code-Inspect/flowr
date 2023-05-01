import { NamedXmlBasedJson } from "../../input-format"
import * as Lang from "../../../../model"
import { retrieveMetaStructure } from "../meta"
import { parseLog } from "../../parser"
import { ParserData } from "../../data"
import { tryParseOneElementBasedOnType } from "../structure/single-element"

/**
 * Try to parse the construct as a {@link Lang.RRepeatLoop}.
 *
 * @param data - The data used by the parser (see {@link ParserData})
 * @param repeatToken - Token which represents the `repeat` keyword
 * @param body - The `body` of the repeat-loop
 *
 * @returns The parsed {@link Lang.RRepeatLoop} or `undefined` if the given construct is not a repeat-loop
 */
export function tryParseRepeatLoop (data: ParserData, repeatToken: NamedXmlBasedJson, body: NamedXmlBasedJson): Lang.RRepeatLoop | undefined {
  if (repeatToken.name !== Lang.Type.Repeat) {
    parseLog.debug('encountered non-repeat token for supposed repeat-loop structure')
    return undefined
  }

  parseLog.debug(`trying to parse repeat-loop with ${JSON.stringify([repeatToken, body])}`)
  const parseBody = tryParseOneElementBasedOnType(data, body)
  if (parseBody === undefined) {
    parseLog.warn(`no body for repeat-loop ${repeatToken} (${body})`)
    return undefined
  }
  const {
    location,
    content
  } = retrieveMetaStructure(data.config, repeatToken.content)
  return {
    type:   Lang.Type.Repeat,
    location,
    lexeme: content,
    body:   parseBody
  }
}
