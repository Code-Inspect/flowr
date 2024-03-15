import { jsonReplacer } from '../../../util/json'
import type { IdMessageBase } from './messages/messages'
import type { Socket } from './net'
import { serverLog } from './server'
import { LogLevel } from '../../../util/log'

export function getUnnamedSocketName(c: Socket): string {
	return `${c.remoteAddress ?? '?'}@${c.remotePort ?? '?'}`
}

export function sendMessage<T extends IdMessageBase>(c: Socket, message: T): void {
	const msg = JSON.stringify(message, jsonReplacer)
	if(serverLog.settings.minLevel <= LogLevel.Debug) {
		serverLog.debug(`[${getUnnamedSocketName(c)}] sending message: ${msg}`)
	}
	c.write(`${msg}\n`)
}
