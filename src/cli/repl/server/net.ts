/**
 * This is just a simple layer to allow me to mock the server's behavior in tests.
 */
import net from 'node:net'

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

/**
 * The socket abstraction of *extractor*.
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

