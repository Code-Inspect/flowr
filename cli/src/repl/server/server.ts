import type { RShell } from '@eagleoutice/flowr/r-bridge'
import type { VersionInformation } from '../commands/version'
import { retrieveVersionInformation } from '../commands/version'
import { FlowRServerConnection } from './connection'
import { getUnnamedSocketName, sendMessage } from './send'
import type { FlowrHelloResponseMessage } from './messages/hello'
import type { FlowrErrorMessage } from './messages/error'
import type { Server, Socket } from './net'
import { NetServer } from './net'
import { FlowrLogger } from '@eagleoutice/flowr/util/log'

// we detach from the main logger so that it can have its own switch
export const serverLog = new FlowrLogger({ name: 'server' })

/**
 * This class controls the TCP server, which can be started by calling {@link start}.
 * Afterward, each incoming connection will be greeted with {@link helloClient} and from
 * thereon be handled by a {@link FlowRServerConnection}.
 */
export class FlowRServer {
	private readonly server:    Server
	private readonly shell:     RShell
	private versionInformation: VersionInformation | undefined

	/** maps names to the respective connection */
	private connections = new Map<string, FlowRServerConnection>()
	private nameCounter = 0

	constructor(shell: RShell, server: Server = new NetServer()) {
		this.server = server
		this.server.onConnect(c => this.onConnect(c))
		this.shell = shell
	}

	public async start(port: number) {
		this.versionInformation = await retrieveVersionInformation(this.shell)
		this.server.start(port)
		serverLog.info(`Server listening on port ${port}`)
	}

	private onConnect(c: Socket) {
		if(!this.versionInformation) {
			notYetInitialized(c, undefined)
			return
		}
		const name = `client-${this.nameCounter++}`
		serverLog.info(`Client connected: ${getUnnamedSocketName(c)} as "${name}"`)

		this.connections.set(name, new FlowRServerConnection(c, name, this.shell))
		helloClient(c, name, this.versionInformation)
		c.on('close', () => {
			this.connections.delete(name)
			serverLog.info(`Client "${name}" disconnected (${getUnnamedSocketName(c)})`)
		})
	}
}


function notYetInitialized(c: Socket, id: string | undefined) {
	sendMessage<FlowrErrorMessage>(c, {
		id,
		type:   'error',
		fatal:  true,
		reason: 'Server not initialized yet (or failed to), please try again later.'
	})
	c.end()
}

function helloClient(c: Socket, name: string, versionInformation: VersionInformation) {
	sendMessage<FlowrHelloResponseMessage>(c, {
		id:         undefined,
		type:       'hello',
		clientName: name,
		versions:   versionInformation
	})
}
