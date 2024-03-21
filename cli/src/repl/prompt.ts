import { ColorEffect, Colors, formatter } from '@eagleoutice/flowr/util/ansi'

export const rawPrompt = 'R>'
// is a function as the 'formatter' is configured only after the cli options have been read
export const prompt = () => `${formatter.format(rawPrompt, { color: Colors.Cyan, effect: ColorEffect.Foreground })} `
