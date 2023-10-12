import { LAST_STEP, SteppingSlicer, StepResults, STEPS_PER_SLICE } from '../../../core'
import {
	DEFAULT_XML_PARSER_CONFIG,
	NormalizedAst,
	RNodeWithParent,
	RShell,
	TokenMap,
	XmlParserConfig
} from '../../../r-bridge'
import { sendMessage } from './send'
import { answerForValidationError, validateBaseMessageFormat, validateMessage } from './validate'
import {
	FileAnalysisRequestMessage, FileAnalysisResponseMessageNQuads,
	requestAnalysisMessage
} from './messages/analysis'
import { requestSliceMessage, SliceRequestMessage, SliceResponseMessage } from './messages/slice'
import { FlowrErrorMessage } from './messages/error'
import { Socket } from './net'
import { serverLog } from './server'
import { ILogObj, Logger } from 'tslog'
import {
	ExecuteEndMessage,
	ExecuteIntermediateResponseMessage,
	ExecuteRequestMessage, requestExecuteReplExpressionMessage
} from './messages/repl'
import { replProcessAnswer } from '../core'
import { ansiFormatter, voidFormatter } from '../../../statistics'
import { cfg2quads, ControlFlowInformation, extractCFG } from '../../../util/cfg'
import { defaultQuadIdGenerator, QuadSerializationConfiguration, serialize2quads } from '../../../util/quads'
import { xlm2jsonObject } from '../../../r-bridge/lang-4.x/ast/parser/xml/internal'
import { deepMergeObject } from '../../../util/objects'
import { df2quads } from '../../../dataflow/graph/quads'
import { DataflowGraph } from '../../../dataflow'

/**
 * Each connection handles a single client, answering to its requests.
 * There is no need to construct this class manually, {@link FlowRServer} will do it for you.
 */
export class FlowRServerConnection {
	private readonly socket:   Socket
	private readonly shell:    RShell
	private readonly tokenMap: TokenMap
	private readonly name:     string
	private readonly logger:   Logger<ILogObj>

	// maps token to information
	private readonly fileMap = new Map<string, {
		filename?: string,
		slicer:    SteppingSlicer
	}>()

	// we do not have to ensure synchronized shell-access as we are always running synchronized
	constructor(socket: Socket, name: string, shell: RShell, tokenMap: TokenMap) {
		this.socket = socket
		this.tokenMap = tokenMap
		this.shell = shell
		this.name = name
		this.logger = serverLog.getSubLogger({ name })
		this.socket.on('data', data => this.handleData(String(data)))
	}

	private currentMessageBuffer = ''
	private handleData(message: string) {
		if(!message.endsWith('\n')) {
			this.currentMessageBuffer += message
			this.logger.trace(`[${this.name}] Received partial message. Buffering ${this.currentMessageBuffer.length}.`)
			return
		}
		message = this.currentMessageBuffer + message
		this.logger.debug(`[${this.name}] Received message: ${message}`)

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
		this.logger.info(`[${this.name}] Received file analysis request for ${message.filename ?? 'unknown file'} (token: ${message.filetoken})`)

		if(this.fileMap.has(message.filetoken)) {
			this.logger.warn(`File token ${message.filetoken} already exists. Overwriting.`)
		}
		const slicer = this.createSteppingSlicerForRequest(message)

		void slicer.allRemainingSteps(false).then(async results => await this.sendFileAnalysisResponse(results, message))
	}

	private async sendFileAnalysisResponse(results: Partial<StepResults<typeof LAST_STEP>>, message: FileAnalysisRequestMessage): Promise<void> {
		let cfg: ControlFlowInformation | undefined = undefined
		if(message.cfg) {
			cfg = extractCFG(results.normalize as NormalizedAst)
		}

		const config = (): QuadSerializationConfiguration => ({ context: message.filename ?? 'unknown', getId: defaultQuadIdGenerator() })
		const parseConfig = deepMergeObject<XmlParserConfig>(DEFAULT_XML_PARSER_CONFIG, { tokenMap: this.tokenMap })

		if(message.format === 'n-quads') {
			sendMessage<FileAnalysisResponseMessageNQuads>(this.socket, {
				type:    'response-file-analysis',
				format:  'n-quads',
				id:      message.id,
				cfg:     cfg ? cfg2quads(cfg, config()) : undefined,
				results: {
					parse:     serialize2quads(await xlm2jsonObject(parseConfig, results.parse as string), config()),
					normalize: serialize2quads(results.normalize?.ast as RNodeWithParent, config()),
					dataflow:  df2quads(results.dataflow?.graph as DataflowGraph, config()),
					ai:        ''
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
			tokenMap:       this.tokenMap,
			// we have to make sure, that the content is not interpreted as a file path if it starts with 'file://' therefore, we do it manually
			request:        {
				request:                message.content === undefined ? 'file' : 'text',
				content:                message.content ?? message.filepath as string,
				ensurePackageInstalled: false
			},
			criterion: [] // currently unknown
		})
		this.fileMap.set(message.filetoken, {
			filename: message.filename,
			slicer
		})
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
		}, request.expression, this.shell, this.tokenMap).then(() => {
			sendMessage<ExecuteEndMessage>(this.socket, {
				type: 'end-repl-execution',
				id:   request.id
			})
		})
	}

}
