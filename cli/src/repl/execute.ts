import { log } from '@eagleoutice/flowr/util/log'
import cp from 'child_process'
import type { Readable, Writable } from 'stream'
import readline from 'readline'
import { guard } from '@eagleoutice/flowr/util/assert'

type Stdio = [stdin: Writable | null, stdout: Readable | null, stderr: Readable | null, extra: Writable | Readable | null | undefined, extra: Writable | Readable | null | undefined]
export type StdioProcessor = (stdio: Stdio) => void

/**
 * Simply captures the output of the script executed by {@link waitOnScript}.
 *
 * @param stdio        - The standard io tuple provided by {@link waitOnScript}
 * @param onStdOutLine - The callback is executed each time we receive a new line from the standard output channel.
 * @param onStdErrLine - The callback is executed each time we receive a new line from the standard error channel.
 */
export function stdioCaptureProcessor(stdio: Stdio, onStdOutLine: (msg: string) => void, onStdErrLine: (msg: string) => void) {
	guard(stdio[1] !== null, 'no stdout given in stdio!')
	const outRl = readline.createInterface({
		input:    stdio[1],
		terminal: false
	})
	guard(stdio[2] !== null, 'no stderr given in stdio!')
	const errRl = readline.createInterface({
		input:    stdio[2],
		terminal: false
	})
	outRl.on('line', onStdOutLine)
	errRl.on('line', onStdErrLine)
}


/**
 * Run the given module with the presented arguments, and wait for it to exit.
 *
 * @param module      - The (flowR) module that you want to use for the fork.
 *                      It is probably best to use {@link __dirname} so you can specify the module relative to your
 *                      current one.
 * @param args        - The arguments you want to start your process with.
 * @param io          - If you omit this argument, the in-, out- and error-channels of the script execution
 *                      will be automatically forwarded to the respective in-, out- and error-channels of your process.
 *                      However, by defining `io` you essentially gain full control on what should happen
 *                      with these streams. For a simple capturing processor, for example if you want to collect
 *                      the output of the script, see {@link stdioCaptureProcessor}.
 * @param exitOnError - If set to `true`, the process will exit with the exit code of the script.
 */
export async function waitOnScript(module: string, args: string[], io?: StdioProcessor, exitOnError = false): Promise<void> {
	log.info(`starting script ${module} with args ${JSON.stringify(args)}`)
	const child = cp.fork(module, args, {
		silent: io !== undefined
	})
	if(io !== undefined) {
		io(child.stdio)
	}
	child.on('exit', (code, signal) => {
		if(code) {
			console.error(`Script ${module} exited with code ${String(code)} and signal ${JSON.stringify(signal)}`)
			if(exitOnError) {
				process.exit(code)
			}
		}
	})
	child.on('error', err => {
		console.error(`Script ${module} signaled error ${JSON.stringify(err)}`)
		if(exitOnError) {
			process.exit(1)
		}
	})
	await new Promise<void>((resolve, reject) => child.on('exit', code => {
		if(exitOnError && code) {
			reject(new Error(`Script ${module} exited with code ${String(code)}`))
		} else {
			resolve()
		}
	}))
}
