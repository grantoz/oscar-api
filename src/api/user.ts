import { Context, Hono } from '@hono'
import { db } from '@mod/db'
import { log, meta, paged, pageOptions } from '../util/mod.ts'
import { zValidator } from '@hono/zod-validator'
import { z } from '@zod'


const user = new Hono().basePath('/user')
user.get('/', async (c: Context) => {
  log.info(c.req.query())
  log.debug('dummy debug log')
  const options = pageOptions(c.req.query() as paged)
  const users = await db.user.findMany(options)
  c.res.headers.append('cache-control', 'max-age=10')
  return c.json({ data: users, meta: meta(users) })
  // return c.text('List Users') // GET /user
})

user.get('/:id{[0-9]+}', async (c: Context) => {
  const { id } = c.req.param()
  log.info('got id', id)
  const user = await db.user.findUnique({
    where: {
      id: Number(id),
    },
  })
  return c.json({ data: user })
})

const userPost = z.object({
  name: z.string(),
  email: z.string(),
})

user.post('/', zValidator('json', userPost), async (c: Context) => {
  const bleh = await c.req.json()
  const { name, email } = c.req.valid('json' as never)
  log.info('Creating user', bleh)
  const result = await db.user.create({
    data: {
      name,
      email,
    },
  })
  return c.json({ data: result })
})

// TODO emit 400 with non-zod error when validation fails
// TODO is it worth using the hono zod validator?

// user.post('/', async (c: Context) => {
//   const bleh = await c.req.json()
//   // const { name, email } = c.req.valid('json' as never)
//   log.info('Creating user', bleh)
//   // const result = await db.user.create({
//   //   data: {
//   //     name,
//   //     email,
//   //   },
//   // })
//   // return c.json({ data: result })
//   return c.text('yay') // POST /user
// })


// user.get('/foo', (c: Context) => c.text('Foo')) // GET /user/foo

export default user