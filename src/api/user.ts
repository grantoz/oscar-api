import { Context, Hono } from '@hono'
import { db, Prisma } from '@mod/db'
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

// const userPost = z.object({
//   name: z.string(),
//   email: z.string(),
// })

// TODO OK this works, what's wrong with the validator?
user.post('/', async (c: Context) => {
  const { name, email } = await c.req.json()
  log.info('Creating user', name, email)
  try {
    const result = await db.user.create({
      data: {
        name,
        email,
        props: Prisma.JsonNull, // or {} if you prefer
      },
    })
    log.info('Created user', result)
    return c.json({ data: result })
    
  // deno-lint-ignore no-explicit-any
  } catch (err: any) {
    if (err.code === 'P2002') {
      log.warn('Create user: Unique constraint failed', err)
      // console.warn('Create user: Unique constraint failed', err)
      return c.json({ error: 'Unique constraint failed' }, 422)
    }
    log.warn('Error creating user', err)
    throw(err)
    // return c.json({ error: 'Error creating user' }, 500)
  }
})

// user.post('/', zValidator('json', userPost), async (c: Context) => {
//   const { name, email } = c.req.valid('json' as never)
//   log.info('Creating user', name, email)
//   try {
//     const result = await db.user.create({
//       data: {
//         name,
//         email,
//       },
//     })
//     log.info('Created user', result)
//     return c.json({ data: result })
    
//   // deno-lint-ignore no-explicit-any
//   } catch (err: any) {
//     if (err.code === 'P2002') {
//       log.error('Create user: Unique constraint failed', err)
//       return c.json({ error: 'Unique constraint failed' }, 429)
//     }
//     log.error('Error creating user', err)
//     throw(err)
//     // return c.json({ error: 'Error creating user' }, 500)
//   }
// })

const userPatchSchema = z.object({
  exitId: z.string(),
  name: z.string().optional(),
  // email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  passwordConfirm: z.string().optional(),
}).refine(schema => {
  schema.password === schema.passwordConfirm
}, {
  message: 'Password and password confirmation must match', 
})

type userPatch = z.infer<typeof userPatchSchema>

user.patch('/', zValidator('json', userPatchSchema), async (c: Context) => {
  const payload: userPatch = c.req.valid('json' as never)
  log.info('Updating user', payload)
  try {
    const result = await db.user.update({
      where: {
        extId: payload.exitId,
      },
      data: {
        name: payload.name,
        phone: payload.phone,
      },
    })
    log.info('Created user', result)
    return c.json({ data: result })
    
  // deno-lint-ignore no-explicit-any
  } catch (err: any) {
    if (err.code === 'P2002') {
      // err.target === ['email']
      log.error('Create user: Unique constraint failed', err)
      return c.json({ error: 'Unique constraint failed' }, 429)
    }
    log.error('Error creating user', err)
    throw(err)
    // return c.json({ error: 'Error creating user' }, 500)
  }
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