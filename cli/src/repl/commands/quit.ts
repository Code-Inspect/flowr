import type { ReplCommand } from './main'
import { log } from '@eagleoutice/flowr/util/log'

export const quitCommand: ReplCommand = {
	description:  'End the repl',
	aliases:      [ 'q', 'exit' ],
	usageExample: ':quit',
	script:       false,
	fn:           () => {
		log.info('bye'); process.exit(0) 
	}
}
