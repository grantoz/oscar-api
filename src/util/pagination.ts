import { z } from '@zod'
import { log } from '@util'
import type { DescribeRouteOptions } from 'hono-openapi'

// deno-lint-ignore no-explicit-any
const meta = (records: any[], query?: pagination, total?: number) => {
  const parsed = query ? paginationQuery.safeParse(query) : undefined
  const page = parsed?.success ? parsed.data.page : 1
  const size = parsed?.success ? parsed.data.size : 10
  const count = total ?? records.length
  return {
    count,
    page,
    size,
    pages: Math.ceil(count / size),
  }
}

const paginationQuery = z.object({
  page: z.string()
    .optional()
    .transform((val) => parseIntOrDefault(val, 1))
    .refine((num) => num > 0, { message: 'page must be a positive integer' }),
  size: z.string() // per page
    .optional()
    .transform((val) => parseIntOrDefault(val, 10))
    .refine((num) => num >= 1 && num <= 100, {
      message: 'size must be between 1 and 100',
    }),
  sort: z.string().optional(),
  dir: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional(),
})

export interface pagination {
  page?: string
  size?: string
  sort?: string
  dir?: 'asc' | 'desc' | 'ASC' | 'DESC'
}

// translation of the above "page" interface into Prisma params
export interface prismaPagination {
  orderBy?: { [key: string]: string }
  skip?: number
  take?: number
  // deno-lint-ignore no-explicit-any
  where?: { [key: string]: any }
}

// OpenAPI query parameter definitions for paginated endpoints
export const paginationParams: NonNullable<DescribeRouteOptions['parameters']> =
  [
    {
      name: 'page',
      in: 'query',
      schema: { type: 'integer', minimum: 1, default: 1 },
    },
    {
      name: 'size',
      in: 'query',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    },
    { name: 'sort', in: 'query', schema: { type: 'string' } },
    {
      name: 'dir',
      in: 'query',
      schema: { type: 'string', enum: ['asc', 'desc', 'ASC', 'DESC'] },
    },
  ]

const parseIntOrDefault = (
  value: string | undefined,
  defaultValue: number,
): number => {
  const parsedValue = parseInt(value || '')
  return Number.isNaN(parsedValue) ? defaultValue : parsedValue
}

// deno-lint-ignore no-explicit-any
const pageOptions = (query: any): prismaPagination => {
  const result = paginationQuery.safeParse(query)
  if (!result.success) {
    return {}
  }
  const parsed = result.data
  log.debug('parsed query string for pageOptions', parsed)
  const options: prismaPagination = {}
  options.skip = (parsed.page - 1) * parsed.size
  options.take = parsed.size
  if (parsed.sort) {
    options.orderBy = {
      [parsed.sort]: parsed.dir?.toLowerCase() || 'asc',
    }
  }
  // const limit = parseIntOrDefault(query.limit, 10)
  // const page = parseIntOrDefault(query.page, 1)
  // TODO - options.where // TODO GRANT YOU ARE HERE
  return options
}

export { meta, pageOptions, paginationQuery }
