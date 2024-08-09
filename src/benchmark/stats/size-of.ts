import type { IEnvironment } from '../../dataflow/environments/environment'
import { BuiltInEnvironment } from '../../dataflow/environments/environment'
import type { DataflowGraph } from '../../dataflow/graph/graph'
import type { DataflowGraphVertexInfo } from '../../dataflow/graph/vertex'
import { VertexType } from '../../dataflow/graph/vertex'
import type { Identifier, IdentifierDefinition } from '../../dataflow/environments/identifier'
import sizeof from 'object-sizeof'

/* we have to kill all processors linked in the default environment as they cannot be serialized and they are shared anyway */
function killBuiltInEnv(env: IEnvironment | undefined): IEnvironment {
	if(env === undefined) {
		return undefined as unknown as IEnvironment
	} else if(env.id === BuiltInEnvironment.id) {
		/* in this case, the reference would be shared for sure */
		return {
			id:     env.id,
			parent: killBuiltInEnv(env.parent),
			memory: new Map<Identifier, IdentifierDefinition[]>()
		}
	}

	const memory = new Map<Identifier, IdentifierDefinition[]>()
	for(const [k, v] of env.memory) {
		memory.set(k, v.filter(v => !v.kind.startsWith('built-in') && !('processor' in v)))
	}

	return {
		id:     env.id,
		parent: killBuiltInEnv(env.parent),
		memory
	}
}

/** Returns the size of the given df graph in bytes (without sharing in-memory) */
export function getSizeOfDfGraph(df: DataflowGraph): number {
	const verts = []
	for(const [, v] of df.vertices(true)) {
		let vertex: DataflowGraphVertexInfo = v
		if(vertex.environment) {
			vertex = {
				...vertex,
				environment: {
					...vertex.environment,
					current: killBuiltInEnv(v.environment?.current)
				}
			} as DataflowGraphVertexInfo
		}

		if(vertex.tag === VertexType.FunctionDefinition) {
			vertex = {
				...vertex,
				subflow: {
					...vertex.subflow,
					environment: {
						...vertex.subflow.environment,
						current: killBuiltInEnv(vertex.subflow.environment.current)
					}
				}
			} as DataflowGraphVertexInfo
		}

		vertex = {
			...vertex,
			/* shared anyway by using constants */
			tag: 0 as unknown
		} as DataflowGraphVertexInfo

		verts.push(vertex)
	}

	return sizeof([...verts, ...df.edges()])
}
