/**
 * This is just a simple layer to allow me to mock the server's behavior in tests.
 */
import net from 'net'
import type WebSocket from 'ws'
import { WebSocketServer } from 'ws'
import type * as Buffer from 'buffer'
import { serverLog } from './server'

/** Function handler that should be triggered when the respective socket connects */
export type OnConnect = (c: Socket) => void

/**
 * A generic server interface that allows us to mock the server's behavior in tests.
 */
export interface Server {
	/**
	 * Register a function to be called when a new socket connects.
	 * This should be only called once per server.
	 */
	onConnect(handler: OnConnect): void
	start(port: number): void
}


export class WebSocketServerWrapper implements Server {
	private server:         WebSocket.Server | undefined
	private connectHandler: ((c: Socket) => void) | undefined

	public onConnect(handler: OnConnect) {
		this.connectHandler = handler
	}

	start(port: number) {
		this.server = new WebSocketServer({ port })
		serverLog.info('WebSocket-Server wrapper is active!')
		this.server.on('connection', c => this.connectHandler?.(new WebSocketWrapper(c)))
	}
}

/**
 * The socket abstraction of *flowR*.
 * Essentially a subset of what the default `net.Socket` of `node` provides.
 */
export interface Socket {
	remoteAddress?: string
	remotePort?:    number
	on(event: 'error', listener: (e: unknown) => void): void
	on(event: 'close', listener: () => void): void
	on(event: 'data', listener: (data: Buffer) => void): void
	write(data: string): void
	end(): void
}

export class WebSocketWrapper implements Socket {
	private readonly socket: WebSocket

	public remoteAddress?: string
	public remotePort?:    number

	constructor(socket: WebSocket) {
		this.socket = socket
		this.remoteAddress = socket.url
	}

	write(data: string) {
		this.socket.send(data)
	}

	end() {
		this.socket.close()
	}

	on(event: 'data' | 'close' | 'error', listener: (data: Buffer) => void) {
		if(event === 'data') {
			this.socket.on('message', listener)
		} else {
			this.socket.on(event, listener)
		}
	}
}

export class NetServer implements Server {
	private readonly server: net.Server

	constructor() {
		this.server = net.createServer()
	}

	public onConnect(handler: OnConnect) {
		this.server.on('connection', handler)
	}

	public start(port: number) {
		this.server.listen(port)
	}
}
