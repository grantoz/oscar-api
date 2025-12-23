import { z } from '@zod'
import { log } from "@util"

// deno-lint-ignore no-explicit-any
const meta = (records: any[]) => {
  return {
    count: records.length,
    page: 1,
    limit: 10,
    pages: Math.ceil(records.length / 10)
  }
}

const pageSchema = z.object({
  p: z.string() // page
    .optional()
    .transform(val => parseIntOrDefault(val, 1))
    .refine(num => num > 0, { message: 'p (page) must be a positive integer' }),
  pp: z.string() // per page
    .optional()
    .transform(val => parseIntOrDefault(val, 10))
    .refine(num => num >= 1 && num <= 100, { message: 'pp (per-page) must be between 1 and 100' }),
  sort: z.string().optional(),
  dir: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional()
})

export interface page {
  p?: string
  pp?: string
  sort?: string
  dir?: 'asc' | 'desc' | 'ASC' | 'DESC'
}

// translation of the above "page" interface into Prisma params
export interface queryOptions {
  orderBy?: { [key: string]: string }
  skip?: number
  take?: number
  // deno-lint-ignore no-explicit-any
  where?: { [key: string]: any }
}

const parseIntOrDefault = (value: string | undefined, defaultValue: number): number => {
  const parsedValue = parseInt(value || '')
  return Number.isNaN(parsedValue) ? defaultValue : parsedValue
}

// deno-lint-ignore no-explicit-any
const pageOptions = (query: any): queryOptions => {
  const result = pageSchema.safeParse(query)
  if (!result.success) {
    return {}
  }
  const parsed = result.data
  log.debug('parsed query string for pageOptions', parsed)
  const options: queryOptions = {}
  options.skip = (parsed.p - 1) * parsed.pp
  options.take = parsed.pp
  if (parsed.sort) {
    options.orderBy = {
      [parsed.sort]: parsed.dir?.toLowerCase() || 'asc'
    }
  }
  // const limit = parseIntOrDefault(query.limit, 10)
  // const page = parseIntOrDefault(query.page, 1)
  // TODO - options.where // TODO GRANT YOU ARE HERE
  return options
}

export { meta, pageSchema, pageOptions }