import type { VersionInformation } from '../../commands/version'
import type { IdMessageBase } from './messages'

/**
 * The hello message is automatically send by the sever upon connection.
 */
export interface FlowrHelloResponseMessage extends IdMessageBase {
	type:       'hello',
	/** The hello message never has an id, it is always undefined */
	id:         undefined,
	/**
	 * A unique name that is assigned to each client.
	 * It has no semantic meaning and is only used/useful for debugging.
	 */
	clientName: string,
	/**
	 * Describes which versions are in use on the server.
	 * @see VersionInformation
	 */
	versions:   VersionInformation
}

