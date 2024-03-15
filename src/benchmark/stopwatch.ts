import { guard } from '../util/assert'

export interface IStoppableStopwatch {
	/** Stop the given stopwatch. */
	stop(): void
}

/** unguarded start-stop wrapper */
class Stopwatch implements IStoppableStopwatch {
	private timeStart: bigint | undefined
	private timeEnd:   bigint | undefined
	private stopped = false

	start() {
		this.timeStart = process.hrtime.bigint()
	}

	stop() {
		this.timeEnd = process.hrtime.bigint()
		// check after to not affect measurements
		guard(!this.stopped, 'cannot stop a stopwatch twice')
		this.stopped = true
	}

	get(): bigint {
		guard(this.timeStart !== undefined && this.timeEnd !== undefined, 'cannot get elapsed time as the stopwatch has not been started/stopped')
		return this.timeEnd - this.timeStart
	}
}


/**
 * Allows to measure keys of type `T` with a `Stopwatch`.
 *
 * Measure with {@link start}, {@link measure} or {@link measureAsync}, retrieve the final measurements with {@link get}.
 */
export class Measurements<T> {
	private measurements = new Map<T, Stopwatch>()

	/**
   * Start a timer for the given key, and guards that this is the first time this key is started.
   * Call {@link IStoppableStopwatch#stop} on the returned stopwatch to stop the timer.
   */
	public start(key: T): IStoppableStopwatch {
		// we guard *before* starting so there is no additional time penalty
		guard(!this.measurements.has(key), () => `already started stop watch for ${JSON.stringify(key)}`)
		const stopwatch = new Stopwatch()
		this.measurements.set(key, stopwatch)
		stopwatch.start()
		return stopwatch
	}

	/**
   * Automatically call {@link Measurements#start|start} and the corresponding stop to measure the execution time of the given function.
   * @see {@link measureAsync}
   */
	public measure<Out>(key: T, fn: () => Out): Out {
		const stopwatch = this.start(key)
		const result = fn()
		stopwatch.stop()
		return result
	}


	/**
   * Similar to {@link measure}, but await the promise as part of the measurement
   *
	 * @param key - The key to write the resulting measurement to
	 * @param fn  - The function to measure
	 *
   * @see measure
   */
	public async measureAsync<Out>(key: T, fn: () => Promise<Out>): Promise<Out> {
		const stopwatch = this.start(key)
		const result = await fn()
		stopwatch.stop()
		return result
	}
	/**
   * Retrieve all measure-results, requires that all stop-watches that have been started have also been stopped.
   */
	public get(): Map<T, bigint> {
		const result = new Map<T, bigint>()
		for(const [key, stopwatch] of this.measurements) {
			result.set(key, stopwatch.get())
		}
		return result
	}
}
