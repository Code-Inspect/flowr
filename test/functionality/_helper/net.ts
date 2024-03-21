import type { OnConnect, Server, Socket } from '../../../cli/src/repl/server/net'
import * as Buffer from 'buffer'
import type { IdMessageBase } from '../../../cli/src/repl'
import type { RShell } from '../../../src/r-bridge'
import { FlowRServer } from '../../../cli/src/repl/server/server'
import { jsonReplacer } from '../../../src/util/json'
import { guard } from '../../../src/util/assert'

export class FakeServer implements Server {
	private connectHandler: OnConnect | undefined
	private port:           number | undefined

	public onConnect(handler: OnConnect) {
		this.connectHandler = handler
	}

	public start(port: number) {
		this.port = port
	}

	public connectClient(socket: FakeSocket) {
		this.connectHandler?.(socket)
	}
}

export function fakeSend<T extends IdMessageBase>(c: FakeSocket, message: T): void {
	const msg = JSON.stringify(message, jsonReplacer)
	c.send(`${msg}\n`)
}

export class FakeSocket implements Socket {
	public readonly remoteAddress = 'fake-address'
	public readonly remotePort = 1234

	private dataHandler:    ((data: Buffer) => void) | undefined
	private messageHandler: ((message: IdMessageBase) => void) | undefined

	private closeHandler: (() => void) | undefined

	private messages: IdMessageBase[] = []

	// for messages sent by the server
	public write(data: string): void {
		const message = JSON.parse(data) as IdMessageBase
		this.messages.push(message)
		this.messageHandler?.(message)
	}

	public end(): void {
		this.closeHandler?.()
	}

	public on(event: 'close', listener: () => void): void
	public on(event: 'error', listener: (e: unknown) => void): void
	public on(event: 'data', listener: (data: Buffer) => void): void
	public on(event: 'close' | 'data' | 'error', listener: (() => void) | ((data: Buffer) => void) | ((e: unknown) => void)): void {
		if(event === 'close') {
			this.closeHandler = listener as () => void
		} else if(event === 'data') {
			this.dataHandler = listener as (data: Buffer) => void
		}
	}

	public send(data: string) {
		this.dataHandler?.(Buffer.Buffer.from(`${data}\n`))
	}

	public async waitForMessage(type: IdMessageBase['type']): Promise<void> {
		return new Promise(resolve => {
			// check if the message was already sent
			for(const message of this.messages) {
				if(message.type === type) {
					resolve()
					return
				}
			}
			// otherwise wait
			this.messageHandler = (message: IdMessageBase) => {
				if(message.type === type) {
					resolve()
				}
			}
		})
	}

	/**
	 * Returns all messages received by the respective socket.
	 *
	 * @param expected - if given, this enforces the respective type field to be as given.
	 * 									 In case of failure, this will throw an exception.
	 */
	public getMessages(expected?: IdMessageBase['type'][]): readonly IdMessageBase[] {
		if(expected) {
			guard(expected.length === this.messages.length, () => `expected ${expected.length}, but received ${this.messages.length} messages: ${JSON.stringify(this.messages)}`)
			for(let i = 0; i < expected.length; i++) {
				const type = this.messages[i].type
				guard(type === expected[i], `expected type differs for message ${i}: ${type} != ${expected[i] ?? '?'}`)
			}
		}

		return this.messages

	}
}

export function withSocket(shell: RShell, fn: (socket: FakeSocket, server: FakeServer) => Promise<void>): () => Promise<void>  {
	return async function() {
		const net = new FakeServer()
		const server = new FlowRServer(shell, net)
		await server.start(42)
		const socket = new FakeSocket()
		net.connectClient(socket)
		await socket.waitForMessage('hello')
		await fn(socket, net)
	}
}
