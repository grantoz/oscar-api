import { Context, Hono } from '@hono'
import { db } from '@mod/db'
import { meta } from '@util'
import { describeRoute, resolver, validator as zValidator } from 'hono-openapi'
import { z } from '@zod'
import { log } from '@util'
// TODO use this as part of validation for get/:id
// import { countryCodes } from 'util/country.ts'

const countryCodeSchema = z.string()
  .length(2, {
    message: 'Invalid country code. Please use valid ISO 3166-1 alpha-2 code.',
  })
  .toUpperCase()
// .refine(code => countryCodes.includes(code), {
//   message: "Invalid country code. Please use valid ISO 3166-1 alpha-2 code."
// });

const countryIdSchema = z.object({
  id: countryCodeSchema,
})

const countrySchema = z.object({
  id: z.string().length(2),
  name: z.string(),
  alpha3: z.string().length(3),
  countryCode: z.int(),
  region: z.string().nullable(),
  regionCode: z.int().nullable(),
  subRegion: z.string().nullable(),
  subRegionCode: z.int().nullable(),
})

const metaSchema = z.object({
  count: z.int(),
  page: z.int(),
  size: z.int(),
  pages: z.int(),
})

const errorSchema = z.object({
  error: z.string(),
})

const countryListResponseSchema = z.object({
  data: z.array(countrySchema),
  meta: metaSchema,
})

const countryResponseSchema = z.object({
  data: countrySchema,
})

export const country = new Hono()
  .get(
    '/',
    describeRoute({
      tags: ['country'],
      summary: 'List countries',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'List of countries',
          content: {
            'application/json': {
              schema: resolver(countryListResponseSchema),
            },
          },
        },
        401: {
          description: 'Not authorized',
          content: {
            'application/json': {
              schema: resolver(errorSchema),
            },
          },
        },
      },
    }),
    async (c: Context) => {
      // const options = pageOptions(c.req.query() as page)
      // const countries = await db.country.findMany(options)
      const countries = await db.country.findMany()
      c.header('max-age', '86400')
      return c.json({ data: countries, meta: meta(countries) })
    },
  )
  .get(
    '/:id',
    describeRoute({
      tags: ['country'],
      summary: 'Get a country by ISO 3166-1 alpha-2 code',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Country',
          content: {
            'application/json': {
              schema: resolver(countryResponseSchema),
            },
          },
        },
        404: {
          description: 'Country not found',
        },
        401: {
          description: 'Not authorized',
          content: {
            'application/json': {
              schema: resolver(errorSchema),
            },
          },
        },
      },
    }),
    zValidator('param', countryIdSchema),
    async (c: Context) => {
      const { id } = c.req.valid('param' as never)
      log.info('getting country', id)
      const item = await db.country.findUnique({
        where: {
          id,
        },
      })
      if (!item) {
        return c.notFound()
      }
      c.header('max-age', '86400')
      return c.json({ data: item })
    },
  )
