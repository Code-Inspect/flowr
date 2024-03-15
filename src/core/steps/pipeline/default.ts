/**
 * Contains the default pipeline for working with flowr
 */
import { createPipeline } from './pipeline'
import { PARSE_WITH_R_SHELL_STEP } from '../all/core/00-parse'
import { NORMALIZE } from '../all/core/10-normalize'
import { STATIC_DATAFLOW } from '../all/core/20-dataflow'
import { STATIC_SLICE } from '../all/static-slicing/00-slice'
import { NAIVE_RECONSTRUCT } from '../all/static-slicing/10-reconstruct'

export const DEFAULT_SLICING_PIPELINE = createPipeline(PARSE_WITH_R_SHELL_STEP, NORMALIZE, STATIC_DATAFLOW, STATIC_SLICE, NAIVE_RECONSTRUCT)

export const DEFAULT_DATAFLOW_PIPELINE = createPipeline(PARSE_WITH_R_SHELL_STEP, NORMALIZE, STATIC_DATAFLOW)
