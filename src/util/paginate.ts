import { z } from '@zod'

import { log } from './log.ts'

// deno-lint-ignore no-explicit-any
export const meta = (records: any[]) => {
  return {
    count: records.length,
    page: 1,
    limit: 10,
    pages: Math.ceil(records.length / 10)
  }
}


export const querySchema = z.object({
  page: z.string()
    .optional()
    .transform(val => parseIntOrDefault(val, 1))
    .refine(num => num > 0, { message: 'Page must be a positive integer' }),
  limit: z.string()
    .optional()
    .transform(val => parseIntOrDefault(val, 10))
    .refine(num => num >= 1 && num <= 100, { message: 'Limit must be between 1 and 100' }),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional()
})

export interface paged {
  page?: string
  limit?: string
  sort?: string
  order?: 'asc' | 'desc' | 'ASC' | 'DESC'
}

export interface queryOptions {
  orderBy?: { [key: string]: string }
  skip?: number
  take?: number
  where?: { [key: string]: string }
}

export const parseIntOrDefault = (value: string | undefined, defaultValue: number): number => {
  const parsedValue = parseInt(value || '')
  return Number.isNaN(parsedValue) ? defaultValue : parsedValue
}

export const pageOptions = (query: paged): object => {
  const result = querySchema.safeParse(query)
  if (!result.success) {
    log.error('Invalid query parameters', result.error)
    throw new Error('Invalid query parameters')
  }
  const parsed = result.data
  log.info('Parsed query', parsed)
  const options: queryOptions = {}
  if (parsed.sort && parsed.order) {
    options.orderBy = {
      [parsed.sort]: parsed.order.toLowerCase(),
    }
  }
  // const limit = parseIntOrDefault(query.limit, 10)
  // const page = parseIntOrDefault(query.page, 1)
  options.skip = (parsed.page - 1) * parsed.limit
  options.take = parsed.limit
  return options
}