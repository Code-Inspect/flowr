/**
 * Tasked with parallelize the benchmarking by calling the given script in an executor-pool style fashion.
 * Now used to parallelize more in _flowR_.
 * @module parallel
 */
import * as cp from 'child_process'
import { log } from './log'
import { guard } from './assert'
import { jsonReplacer } from './json'

export type Arguments = string[]
type WorkingQueue = Arguments[]

/**
 * This is not really generic but written especially for the benchmarking script.
 * It offers a work stealing thread pool executor.
 */
export class LimitedThreadPool {
	private readonly workingQueue: WorkingQueue
	private readonly limit:        number
	private readonly parallel:     number
	private readonly module:       string
	private counter = 0
	private skipped:               Arguments[] = []
	private currentlyRunning = new Set<Arguments>()
	private reportingInterval:     NodeJS.Timer | undefined = undefined

	/**
   * Create a new parallel helper that runs the given `module` once for each list of {@link Arguments} in the `queue`.
   * The `limit` stops the execution if `<limit>` number of runs exited successfully.
   * The `parallel` parameter limits the number of parallel executions.
   */
	constructor(module: string, queue: WorkingQueue, limit: number, parallel: number) {
		this.workingQueue = queue
		this.limit = limit
		this.module = module
		this.parallel = parallel
	}

	public async run(): Promise<void> {
		this.reportingInterval = setInterval(() => {
			console.log(`Waiting for: ${JSON.stringify(this.currentlyRunning, jsonReplacer)}`)
		}, 20000)
		const promises: Promise<void>[] = []
		// initial run, runNext will schedule itself recursively we use the limit too if there are more cores than limit :D
		while(this.currentlyRunning.size < Math.min(this.parallel, this.limit) && this.workingQueue.length > 0) {
			promises.push(this.runNext())
		}
		await Promise.all(promises)
		clearInterval(this.reportingInterval as NodeJS.Timeout)
	}

	public getStats(): { counter: number, skipped: Arguments[]} {
		return { counter: this.counter, skipped: this.skipped }
	}

	private async runNext(): Promise<void> {
		if(this.counter + this.currentlyRunning.size >= this.limit || this.workingQueue.length <= 0) {
			console.log(`Skip running next as counter: ${this.counter} and currently running: ${this.currentlyRunning.size} beat ${this.limit} or ${this.workingQueue.length}`)
			return
		}

		const args = this.workingQueue.pop()
		guard(args !== undefined, () => `arguments should not be undefined in ${JSON.stringify(this.workingQueue)}`)

		this.currentlyRunning.add(args)

		console.log(`[${this.counter}/${this.limit}] Running next, currently running: ${this.currentlyRunning.size}, queue: ${this.workingQueue.length} [args: ${args.join(' ')}]`)

		const child = cp.fork(this.module, args)
		child.on('exit', this.onChildExit(args))

		// schedule re-schedule
		await new Promise<void>(resolve => child.on('exit', resolve)).then(() => this.runNext())
	}


	private onChildExit(args: string[]) {
		return (code: number, signal: unknown) => {
			if(code === 0) {
				this.counter++
			} else {
				log.error(`Benchmark for ${JSON.stringify(args)} exited with code ${JSON.stringify(code)} (signal: ${JSON.stringify(signal)})`)
				this.skipped.push(args)
			}
			this.currentlyRunning.delete(args)
		}
	}
}
