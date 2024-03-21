/**
 * Implementation of a bidirectional map
 *
 * All map-related functions are based on the normal Key -&gt; Value map
 */
export class BiMap<K, V extends object> implements Map<K, V> {
	public readonly [Symbol.toStringTag]: string = 'BiMap'
	public size = 0
	private readonly k2v = new Map<K, V>()
	private v2k = new WeakMap<V, K>()

	constructor(base?: Iterable<[K, V]>) {
		if(base != null) {
			for(const [k, v] of base) {
				this.set(k, v)
			}
		}
	}

	public [Symbol.iterator](): IterableIterator<[K, V]> {
		return this.k2v[Symbol.iterator]()
	}

	public clear(): void {
		this.size = 0
		this.k2v.clear()
		this.v2k = new WeakMap<V, K>()
	}

	public delete(key: K): boolean {
		const value = this.k2v.get(key)
		if(value === undefined) {
			return false
		}
		this.k2v.delete(key)
		this.v2k.delete(value)
		this.size = this.k2v.size
		return true
	}

	public entries(): IterableIterator<[K, V]> {
		return this.k2v.entries()
	}

	public forEach(callbackFunction: (value: V, key: K, map: Map<K, V>) => void): void {
		this.k2v.forEach(callbackFunction)
	}

	public get(key: K): V | undefined {
		return this.k2v.get(key)
	}

	public getKey(value: V): K | undefined {
		return this.v2k.get(value)
	}

	public has(key: K): boolean {
		return this.k2v.has(key)
	}

	public hasValue(value: V): boolean {
		return this.v2k.has(value)
	}

	public keys(): IterableIterator<K> {
		return this.k2v.keys()
	}

	public set(key: K, value: V): this {
		this.k2v.set(key, value)
		this.v2k.set(value, key)
		this.size = this.k2v.size
		return this
	}

	public values(): IterableIterator<V> {
		return this.k2v.values()
	}
}
