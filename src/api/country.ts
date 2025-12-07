import { Context, Hono } from '@hono'
import { db } from '@mod/db'
// import { meta, page, pageOptions } from '../util/mod.ts' // do I even want pagination for getall?
import { meta } from '../util/mod.ts'
import { zValidator } from '@hono/zod-validator'
import { z } from '@zod'
// TODO use this as part of validation for get/:id
// import { countryCodes } from '../service/country.ts'

const countryCodeSchema = z.string()
  .length(2, { message: "Invalid country code. Please use valid ISO 3166-1 alpha-2 code." })
  .toUpperCase()
  // .refine(code => countryCodes.includes(code), {
  //   message: "Invalid country code. Please use valid ISO 3166-1 alpha-2 code."
  // });

export const country = new Hono()
.get('/', async (c: Context) => {
  // const options = pageOptions(c.req.query() as page)
  // const countries = await db.country.findMany(options)
  const countries = await db.country.findMany()
  c.header('max-age', '86400')
  return c.json({ data: countries, meta: meta(countries) })
})

.get('/:id', zValidator('param', countryCodeSchema), async (c: Context) => {
  const { id } = c.req.valid('param' as never);
  const item = await db.country.findUnique({
    where: {
      id,
    },
  })
  if (!item) {
    return c.notFound()
  }
  c.header('max-age: 86400')
  return c.json({ data: item })
})
