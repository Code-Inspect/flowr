/**
 * A default map allows for a generator to produce values automatically if you want to add something to a map that does not have a value associated with a given key.
 * This does not implement the default map interface as return types (and some future methods may) change
 */
export class DefaultMap<K, V = K> {
	/** the internal map the default map wraps around */
	private readonly internal:  Map<K, V>
	/** generator function to produce a default value for a given key */
	private readonly generator: (k: K) => V

	/**
   * @param generator - the generator to produce a default value for a given key
   * @param map       - the initial map to start with
   */
	public constructor(generator: (k: K) => V, map = new Map<K, V>()) {
		this.generator = generator
		this.internal = map
	}

	/**
   * Sets a value for a given key.
   * As you provide value, this does not invoke the generator!
   */
	public set(k: K, v: V): this {
		this.internal.set(k, v)
		return this
	}

	/**
   * Return a value for the given key, if the key does not exist within the default map,
   * this will invoke the generator and assign the produced value.
   */
	public get(k: K): V {
		const potential = this.internal.get(k)
		if(potential !== undefined) {
			return potential
		} else {
			const defaultValue = this.generator(k)
			this.internal.set(k, defaultValue)
			return defaultValue
		}
	}

	/**
   * Iterates over all entries that have been set (explicitly or by the generator)
   */
	public entries(): IterableIterator<[K, V]> {
		return this.internal.entries()
	}

	/** returns only the keys really stored in the map */
	public keys(): IterableIterator<K> {
		return this.internal.keys()
	}

	public values(): IterableIterator<V> {
		return this.internal.values()
	}

	public delete(k: K): boolean {
		return this.internal.delete(k)
	}

	public size(): number {
		return this.internal.size
	}
}
