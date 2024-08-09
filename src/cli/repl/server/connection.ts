import { sendMessage } from './send'
import { answerForValidationError, validateBaseMessageFormat, validateMessage } from './validate'
import type { FileAnalysisRequestMessage, FileAnalysisResponseMessageNQuads } from './messages/analysis'
import { requestAnalysisMessage } from './messages/analysis'
import type { SliceRequestMessage, SliceResponseMessage } from './messages/slice'
import { requestSliceMessage } from './messages/slice'
import type { FlowrErrorMessage } from './messages/error'
import type { Socket } from './net'
import { serverLog } from './server'
import type { ILogObj, Logger } from 'tslog'
import type { ExecuteEndMessage, ExecuteIntermediateResponseMessage, ExecuteRequestMessage } from './messages/repl'
import { requestExecuteReplExpressionMessage } from './messages/repl'
import { replProcessAnswer } from '../core'
import { PipelineExecutor } from '../../../core/pipeline-executor'
import { LogLevel } from '../../../util/log'
import type { ControlFlowInformation } from '../../../util/cfg/cfg'
import { cfg2quads, extractCFG } from '../../../util/cfg/cfg'
import type { QuadSerializationConfiguration } from '../../../util/quads'
import { defaultQuadIdGenerator } from '../../../util/quads'
import { printStepResult, StepOutputFormat } from '../../../core/print/print'
import { PARSE_WITH_R_SHELL_STEP } from '../../../core/steps/all/core/00-parse'
import type { DataflowInformation } from '../../../dataflow/info'
import { NORMALIZE } from '../../../core/steps/all/core/10-normalize'
import { STATIC_DATAFLOW } from '../../../core/steps/all/core/20-dataflow'
import { ansiFormatter, voidFormatter } from '../../../util/ansi'
import { PipelineStepStage } from '../../../core/steps/pipeline-step'
import { DEFAULT_SLICING_PIPELINE } from '../../../core/steps/pipeline/default-pipelines'
import type { RShell } from '../../../r-bridge/shell'
import type { PipelineOutput } from '../../../core/steps/pipeline/pipeline'
import type { NormalizedAst } from '../../../r-bridge/lang-4.x/ast/model/processing/decorate'
import type { DeepPartial } from 'ts-essentials'
import { DataflowGraph } from '../../../dataflow/graph/graph'
import * as tmp from 'tmp'
import fs from 'fs'
import type { RParseRequests } from '../../../r-bridge/retriever'

/**
 * Each connection handles a single client, answering to its requests.
 * There is no need to construct this class manually, {@link FlowRServer} will do it for you.
 */
export class FlowRServerConnection {
	private readonly socket:              Socket
	private readonly shell:               RShell
	private readonly name:                string
	private readonly logger:              Logger<ILogObj>
	private readonly allowRSessionAccess: boolean

	// maps token to information
	private readonly fileMap = new Map<string, {
		filename?: string,
		pipeline:  PipelineExecutor<typeof DEFAULT_SLICING_PIPELINE>
	}>()

	// we do not have to ensure synchronized shell-access as we are always running synchronized
	constructor(socket: Socket, name: string, shell: RShell, allowRSessionAccess: boolean) {
		this.socket = socket
		this.shell = shell
		this.name = name
		this.logger = serverLog.getSubLogger({ name })
		this.socket.on('data', data => this.handleData(String(data)))
		this.socket.on('error', e => this.logger.error(`[${this.name}] Error while handling connection: ${String(e)}`))
		this.allowRSessionAccess = allowRSessionAccess
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
				void this.handleFileAnalysisRequest(request.message as FileAnalysisRequestMessage)
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

	private async handleFileAnalysisRequest(base: FileAnalysisRequestMessage) {
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

		const tempFile = tmp.fileSync({ postfix: '.R' })
		const slicer = this.createPipelineExecutorForRequest(message, tempFile.name)

		await slicer.allRemainingSteps(false).then(async results => await this.sendFileAnalysisResponse(results, message))
			.catch(e => {
				this.logger.error(`[${this.name}] Error while analyzing file ${message.filename ?? 'unknown file'}: ${String(e)}`)
				sendMessage<FlowrErrorMessage>(this.socket, {
					id:     message.id,
					type:   'error',
					fatal:  false,
					reason: `Error while analyzing file ${message.filename ?? 'unknown file'}: ${String(e)}`
				})
			})

		// this is an interestingly named function that means "I am a callback that removes a file" - so this deletes the file
		tempFile.removeCallback()
	}

	private async sendFileAnalysisResponse(results: Partial<PipelineOutput<typeof DEFAULT_SLICING_PIPELINE>>, message: FileAnalysisRequestMessage): Promise<void> {
		let cfg: ControlFlowInformation | undefined = undefined
		if(message.cfg) {
			cfg = extractCFG(results.normalize as NormalizedAst)
		}

		const config = (): QuadSerializationConfiguration => ({ context: message.filename ?? 'unknown', getId: defaultQuadIdGenerator() })
		const sanitizedResults = sanitizeAnalysisResults(results)

		if(message.format === 'n-quads') {
			sendMessage<FileAnalysisResponseMessageNQuads>(this.socket, {
				type:    'response-file-analysis',
				format:  'n-quads',
				id:      message.id,
				cfg:     cfg ? cfg2quads(cfg, config()) : undefined,
				results: {
					parse:     await printStepResult(PARSE_WITH_R_SHELL_STEP, sanitizedResults.parse as string, StepOutputFormat.RdfQuads, config()),
					normalize: await printStepResult(NORMALIZE, sanitizedResults.normalize as NormalizedAst, StepOutputFormat.RdfQuads, config()),
					dataflow:  await printStepResult(STATIC_DATAFLOW, sanitizedResults.dataflow as DataflowInformation, StepOutputFormat.RdfQuads, config())
				}
			})
		} else {
			sendMessage(this.socket, {
				type:    'response-file-analysis',
				format:  'json',
				id:      message.id,
				cfg,
				results: sanitizedResults
			})
		}
	}

	private createPipelineExecutorForRequest(message: FileAnalysisRequestMessage, tempFile: string) {
		let request: RParseRequests
		if(message.content !== undefined){
			// we store the code in a temporary file in case it's too big for the shell to handle
			fs.writeFileSync(tempFile, message.content ?? '')
			request = { request: 'file', content: tempFile }
		} else if(message.filepath !== undefined) {
			if(typeof message.filepath === 'string') {
				request = { request: 'file', content: message.filepath }
			} else {
				request = message.filepath.map(fp => ({ request: 'file', content: fp }))
			}
		} else {
			throw new Error('Either content or filepath must be defined.')
		}

		const slicer = new PipelineExecutor(DEFAULT_SLICING_PIPELINE, {
			shell:     this.shell,
			request,
			criterion: [] // currently unknown
		})
		if(message.filetoken) {
			this.logger.info(`Storing file token ${message.filetoken}`)
			this.fileMap.set(message.filetoken, {
				filename: message.filename,
				pipeline: slicer
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

		fileInformation.pipeline.updateRequest({ criterion: request.criterion })
		void fileInformation.pipeline.allRemainingSteps(true).then(results => {
			sendMessage<SliceResponseMessage>(this.socket, {
				type:    'response-slice',
				id:      request.id,
				results: Object.fromEntries(
					Object.entries(results)
						.filter(([k,]) => DEFAULT_SLICING_PIPELINE.steps.get(k)?.executed === PipelineStepStage.OncePerRequest)
				) as SliceResponseMessage['results']
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
		}, request.expression, this.shell,
		this.allowRSessionAccess
		).then(() => {
			sendMessage<ExecuteEndMessage>(this.socket, {
				type: 'end-repl-execution',
				id:   request.id
			})
		})
	}

}

export function sanitizeAnalysisResults(results: Partial<PipelineOutput<typeof DEFAULT_SLICING_PIPELINE>>): DeepPartial<PipelineOutput<typeof DEFAULT_SLICING_PIPELINE>> {
	return {
		...results,
		normalize: {
			...results.normalize,
			idMap: undefined
		},
		dataflow: {
			...results.dataflow,
			// we want to keep the DataflowGraph type information, but not the idMap
			graph: new DataflowGraph(undefined).mergeWith(results.dataflow?.graph)
		}
	}
}
