import { XmlBasedJson } from '../../input-format'
import { retrieveMetaStructure } from '../meta'
import { string2ts } from '../../../../../values'
import { parseLog } from '../../parser'
import { Type, RString } from '../../../../model'
import { executeHook } from '../../hooks'
import { ParserData } from '../../data'
import { guard } from '../../../../../../../util/assert'

/**
 * Normalize the given object as a R string (see {@link string2ts}).
 * This requires you to check the corresponding name beforehand.
 *
 * @param data - The data used by the parser (see {@link ParserData})
 * @param obj  - The json object to extract the meta-information from
 */
export function normalizeString(data: ParserData, obj: XmlBasedJson): RString {
  parseLog.debug('[string]')
  obj = executeHook(data.hooks.values.onString.before, data, obj)

  const { location, content } = retrieveMetaStructure(data.config, obj)

  // based on https://www.rdocumentation.org/packages/utils/versions/3.6.2/topics/getParseData we do not get strings with 1000 characters or more within the text field.
  // therefore, we recover the full string from the surrounding expr lexeme field
  let stringContent = content
  if(stringContent.startsWith('[')) { // something like "[9999 chars quoted with '"']"
    guard(data.currentLexeme !== undefined, 'need current lexeme wrapper for too long strings as they are not stored by the R parser post-processor')
    stringContent = data.currentLexeme
  }

  const result: RString = {
    type:    Type.String,
    location,
    content: string2ts(stringContent),
    lexeme:  stringContent,
    info:    {
      // TODO: include children etc.
      fullRange:        data.currentRange,
      additionalTokens: [],
      fullLexeme:       data.currentLexeme
    }
  }
  return executeHook(data.hooks.values.onString.after, data, result)
}
