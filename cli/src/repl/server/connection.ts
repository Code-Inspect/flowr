import type { StepResults } from '@eagleoutice/flowr/core'
import { LAST_STEP, printStepResult, SteppingSlicer, STEPS_PER_SLICE } from '@eagleoutice/flowr/core'
import type { NormalizedAst, RShell } from '@eagleoutice/flowr/r-bridge'
import { sendMessage } from './send'
import { answerForValidationError, validateBaseMessageFormat, validateMessage } from './validate'
import type {
	FileAnalysisRequestMessage,
	FileAnalysisResponseMessageNQuads } from './messages/analysis'
import {
	requestAnalysisMessage
} from './messages/analysis'
import type { SliceRequestMessage, SliceResponseMessage } from './messages/slice'
import { requestSliceMessage } from './messages/slice'
import type { FlowrErrorMessage } from './messages/error'
import type { Socket } from './net'
import { serverLog } from './server'
import type { ILogObj, Logger } from 'tslog'
import type {
	ExecuteEndMessage,
	ExecuteIntermediateResponseMessage,
	ExecuteRequestMessage } from './messages/repl'
import {
	requestExecuteReplExpressionMessage
} from './messages/repl'
import { replProcessAnswer } from '../core'
import { ansiFormatter, voidFormatter } from '@eagleoutice/flowr/util/ansi'
import { LogLevel } from '@eagleoutice/flowr/util/log'
import type { ControlFlowInformation } from '@eagleoutice/flowr/util/cfg/cfg'
import { cfg2quads, extractCFG } from '@eagleoutice/flowr/util/cfg/cfg'
import { StepOutputFormat } from '@eagleoutice/flowr/core/print/print'
import type { DataflowInformation } from '@eagleoutice/flowr/dataflow/internal/info'
import type { QuadSerializationConfiguration } from '@eagleoutice/flowr/util/quads'
import { defaultQuadIdGenerator } from '@eagleoutice/flowr/util/quads'

/**
 * Each connection handles a single client, answering to its requests.
 * There is no need to construct this class manually, {@link FlowRServer} will do it for you.
 */
export class FlowRServerConnection {
	private readonly socket: Socket
	private readonly shell:  RShell
	private readonly name:   string
	private readonly logger: Logger<ILogObj>

	// maps token to information
	private readonly fileMap = new Map<string, {
		filename?: string,
		slicer:    SteppingSlicer
	}>()

	// we do not have to ensure synchronized shell-access as we are always running synchronized
	constructor(socket: Socket, name: string, shell: RShell) {
		this.socket = socket
		this.shell = shell
		this.name = name
		this.logger = serverLog.getSubLogger({ name })
		this.socket.on('data', data => this.handleData(String(data)))
		this.socket.on('error', e => this.logger.error(`[${this.name}] Error while handling connection: ${String(e)}`))
	}

	private currentMessageBuffer = ''
	private handleData(message: string) {
		if(!message.endsWith('\n')) {
			this.currentMessageBuffer += message
			this.logger.trace(`[${this.name}] Received partial message. Buffering ${this.currentMessageBuffer.length}.`)
			return
		}
		message = this.currentMessageBuffer + message
		if(this.logger.settings.minLevel >= LogLevel.Debug) {
			this.logger.debug(`[${this.name}] Received message: ${message}`)
		}

		this.currentMessageBuffer = ''
		const request = validateBaseMessageFormat(message)
		if(request.type === 'error') {
			answerForValidationError(this.socket, request)
			return
		}
		switch(request.message.type) {
			case 'request-file-analysis':
				this.handleFileAnalysisRequest(request.message as FileAnalysisRequestMessage)
				break
			case 'request-slice':
				this.handleSliceRequest(request.message as SliceRequestMessage)
				break
			case 'request-repl-execution':
				this.handleRepl(request.message as ExecuteRequestMessage)
				break
			default:
				sendMessage<FlowrErrorMessage>(this.socket, {
					id:     request.message.id,
					type:   'error',
					fatal:  true,
					reason: `The message type ${JSON.stringify(request.message.type as string | undefined ?? 'undefined')} is not supported.`
				})
				this.socket.end()
		}
	}

	private handleFileAnalysisRequest(base: FileAnalysisRequestMessage) {
		const requestResult = validateMessage(base, requestAnalysisMessage)
		if(requestResult.type === 'error') {
			answerForValidationError(this.socket, requestResult, base.id)
			return
		}
		const message = requestResult.message
		this.logger.info(`[${this.name}] Received file analysis request for ${message.filename ?? 'unknown file'}${message.filetoken ? ' with token: ' + message.filetoken : ''}`)

		if(message.filetoken && this.fileMap.has(message.filetoken)) {
			this.logger.warn(`File token ${message.filetoken} already exists. Overwriting.`)
		}
		const slicer = this.createSteppingSlicerForRequest(message)

		void slicer.allRemainingSteps(false).then(async results => await this.sendFileAnalysisResponse(results, message))
			.catch(e => {
				this.logger.error(`[${this.name}] Error while analyzing file ${message.filename ?? 'unknown file'}: ${String(e)}`)
				sendMessage<FlowrErrorMessage>(this.socket, {
					id:     message.id,
					type:   'error',
					fatal:  false,
					reason: `Error while analyzing file ${message.filename ?? 'unknown file'}: ${String(e)}`
				})
			})
	}

	private async sendFileAnalysisResponse(results: Partial<StepResults<typeof LAST_STEP>>, message: FileAnalysisRequestMessage): Promise<void> {
		let cfg: ControlFlowInformation | undefined = undefined
		if(message.cfg) {
			cfg = extractCFG(results.normalize as NormalizedAst)
		}

		const config = (): QuadSerializationConfiguration => ({ context: message.filename ?? 'unknown', getId: defaultQuadIdGenerator() })

		if(message.format === 'n-quads') {
			sendMessage<FileAnalysisResponseMessageNQuads>(this.socket, {
				type:    'response-file-analysis',
				format:  'n-quads',
				id:      message.id,
				cfg:     cfg ? cfg2quads(cfg, config()) : undefined,
				results: {
					parse:     await printStepResult('parse', results.parse as string, StepOutputFormat.RdfQuads, config()),
					normalize: await printStepResult('normalize', results.normalize as NormalizedAst, StepOutputFormat.RdfQuads, config()),
					dataflow:  await printStepResult('dataflow', results.dataflow as DataflowInformation, StepOutputFormat.RdfQuads, config())
				}
			})
		} else {
			sendMessage(this.socket, {
				type:    'response-file-analysis',
				format:  'json',
				id:      message.id,
				cfg,
				results: {
					...results,
					normalize: {
						...results.normalize,
						idMap: undefined
					}
				}
			})
		}
	}

	private createSteppingSlicerForRequest(message: FileAnalysisRequestMessage) {
		const slicer = new SteppingSlicer({
			stepOfInterest: LAST_STEP,
			shell:          this.shell,
			// we have to make sure, that the content is not interpreted as a file path if it starts with 'file://' therefore, we do it manually
			request:        {
				request: message.content === undefined ? 'file' : 'text',
				content: message.content ?? message.filepath as string
			},
			criterion: [] // currently unknown
		})
		if(message.filetoken) {
			this.logger.info(`Storing file token ${message.filetoken}`)
			this.fileMap.set(message.filetoken, {
				filename: message.filename,
				slicer
			})
		}
		return slicer
	}

	private handleSliceRequest(base: SliceRequestMessage) {
		const requestResult = validateMessage(base, requestSliceMessage)
		if(requestResult.type === 'error') {
			answerForValidationError(this.socket, requestResult, base.id)
			return
		}

		const request = requestResult.message
		this.logger.info(`[${request.filetoken}] Received slice request with criteria ${JSON.stringify(request.criterion)}`)

		const fileInformation = this.fileMap.get(request.filetoken)
		if(!fileInformation) {
			sendMessage<FlowrErrorMessage>(this.socket, {
				id:     request.id,
				type:   'error',
				fatal:  false,
				reason: `The file token ${request.filetoken} has never been analyzed.`
			})
			return
		}

		fileInformation.slicer.updateCriterion(request.criterion)
		void fileInformation.slicer.allRemainingSteps(true).then(results => {
			sendMessage<SliceResponseMessage>(this.socket, {
				type:    'response-slice',
				id:      request.id,
				results: Object.fromEntries(Object.entries(results).filter(([k,]) => Object.hasOwn(STEPS_PER_SLICE, k))) as SliceResponseMessage['results']
			})
		}).catch(e => {
			this.logger.error(`[${this.name}] Error while analyzing file for token ${request.filetoken}: ${String(e)}`)
			sendMessage<FlowrErrorMessage>(this.socket, {
				id:     request.id,
				type:   'error',
				fatal:  false,
				reason: `Error while analyzing file for token ${request.filetoken}: ${String(e)}`
			})
		})
	}


	private handleRepl(base: ExecuteRequestMessage) {
		const requestResult = validateMessage(base, requestExecuteReplExpressionMessage)

		if(requestResult.type === 'error') {
			answerForValidationError(this.socket, requestResult, base.id)
			return
		}

		const request = requestResult.message

		const out = (stream: 'stdout' | 'stderr', msg: string) => {
			sendMessage<ExecuteIntermediateResponseMessage>(this.socket, {
				type:   'response-repl-execution',
				id:     request.id,
				result: msg,
				stream
			})
		}

		void replProcessAnswer({
			formatter: request.ansi ? ansiFormatter : voidFormatter,
			stdout:    msg => out('stdout', msg),
			stderr:    msg => out('stderr', msg)
		}, request.expression, this.shell).then(() => {
			sendMessage<ExecuteEndMessage>(this.socket, {
				type: 'end-repl-execution',
				id:   request.id
			})
		})
	}

}
