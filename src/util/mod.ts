import { log as logger } from './log.ts'
import * as pager from './paginate.ts'

export const meta = pager.meta
export const pageOptions = pager.pageOptions
export type paged = pager.paged
export type queryOptions = pager.queryOptions
export const parseIntOrDefault = pager.parseIntOrDefault

export const log = logger