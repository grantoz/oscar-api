import { Context, Hono } from '@hono'
import { db, Prisma } from '@mod/db'
import { log, meta, paged, pageOptions } from '../util/mod.ts'
import { zValidator } from '@hono/zod-validator'
import { z } from '@zod'
import { genSalt, hashPassword } from '../service/user.ts'
import { userView } from '../view/user.ts'

const userPatchSchema = z.object({
  extId: z.string(),
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
const userPostSchema = userPatchSchema.omit({ extId: true }).extend({email: z.email()})
type userPost = z.infer<typeof userPostSchema>

export const user = new Hono()
.get('/', async (c: Context) => {
  const options = pageOptions(c.req.query() as paged)
  const users = await db.user.findMany(options)
  // TODO cache headers, etag etc
  return c.json({ data: users.map(userView), meta: meta(users) })
})

// TODO declarative approach to single item routes
.get('/:id{[0-9]+}', async (c: Context) => {
  const { id } = c.req.param()
  const user = await db.user.findUnique({
    where: {
      id: Number(id),
    },
  })
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }
  return c.json({ data: userView(user) })
})

.post('/', zValidator('json', userPostSchema), async (c: Context) => {
  // const { name, email } = await c.req.json()
  const payload: userPost = c.req.valid('json' as never)
  const userData: Prisma.UserCreateInput = {
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    props: {}, // Prisma.JsonNull, // or {} if you prefer
  }
  if (payload.password) {
    userData.salt = genSalt()
    userData.hash = await hashPassword(payload.password, userData.salt)
  }

  const logData = Object.assign({}, userData);
  delete logData.salt;
  delete logData.hash;
  log.info('creating user', logData)

  try {
    await db.user.create({data: userData})
    log.info('Created user', logData)
    return c.json({ data: logData })

  // deno-lint-ignore no-explicit-any
  } catch (err: any) {
    if (err.code === 'P2002') {
      log.warn('create user: unique constraint failed', err)
      return c.json({ error: 'unique constraint failed' }, 422)
    }
    log.warn('Error creating user', err)
    throw(err)
  }
})
.patch('/', zValidator('json', userPatchSchema), async (c: Context) => {
  const payload: userPatch = c.req.valid('json' as never)
  log.info('Updating user', payload)
  try {
    const result = await db.user.update({
      where: {
        extId: payload.extId,
      },
      data: {
        name: payload.name,
        phone: payload.phone,
      },
    })
    const userPatchResult = userView(result)
    log.info('Created user', userPatchResult)
    return c.json({ data: userPatchResult })

  // deno-lint-ignore no-explicit-any
  } catch (err: any) {
    if (err.code === 'P2002') {
      // err.target === ['email']
      log.error('patch user: unique constraint failed', err)
      return c.json({ error: 'Unique constraint failed' }, 429)
    }
    log.error('Error creating user', err)
    throw(err)
    // TODO test various error conditions, logging and output for failure modes
    // return c.json({ error: 'Error creating user' }, 500)
  }
})
