/**
 * Contains the default pipeline for working with flowr
 */
import { createPipeline } from './pipeline'
import { PARSE_WITH_R_SHELL_STEP } from '../all/00-parse'
import { NORMALIZE } from '../all/10-normalize'
import { LEGACY_STATIC_DATAFLOW } from '../all/20-dataflow'
import { STATIC_SLICE } from '../all/30-slice'
import { NAIVE_RECONSTRUCT } from '../all/40-reconstruct'

export const DEFAULT_SLICING_PIPELINE = createPipeline(PARSE_WITH_R_SHELL_STEP, NORMALIZE, LEGACY_STATIC_DATAFLOW, STATIC_SLICE, NAIVE_RECONSTRUCT)