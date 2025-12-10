import { Context, Hono } from '@hono'
import { db, Prisma } from '@mod/db'
import { log, meta, page, pageOptions, queryOptions } from '../util/mod.ts'
import { zValidator } from '@hono/zod-validator'
import { z } from '@zod'
import { genSalt, hashPassword } from '../service/user.ts'
import { userView } from '../view/user.ts'
import { getLastModified, setLastModified } from './lastModified.ts'

// TODO add email verification, phone verification etc
// TODO add role based access control, admin user etc

const uuidIdSchema = z.object({
  id: z.uuidv7(),
})

const userPatchSchema = z.object({
  id: z.uuidv7(),
  name: z.string().optional(),
  // email: z.string().optional(), // TODO how do we update email?
  phone: z.string().optional(),
  password: z.string().optional(),
  passwordConfirm: z.string().optional(),
}).refine(schema => {
  schema.password === schema.passwordConfirm
}, {
  message: 'Password and password confirmation must match',
})
type userPatch = z.infer<typeof userPatchSchema>

const userPostSchema = userPatchSchema.omit({ id: true }).extend({email: z.email()})
type userPost = z.infer<typeof userPostSchema>

export const user = new Hono()
.get('/', async (c: Context) => {
  const options = pageOptions(c.req.query() as page)
  const users = await db.user.findMany(options)
  // TODO cache headers
  c.header('last-modified', await getLastModified('user'))
  return c.json({ data: users.map(userView), meta: meta(users) })
})

// TODO generalise ID fetch routes
.get('/:id', zValidator('param', uuidIdSchema), async (c: Context) => {
  const { id } = c.req.valid('param' as never);
  const user = await db.user.findUnique({
    where: {
      id,
    },
  })
  if (!user) {
    return c.notFound()
  }
  return c.json({ data: userView(user) })
})

.get('/:id/post', zValidator('param', uuidIdSchema), async (c: Context) => {
  const { id } = c.req.valid('param' as never);
  const user = await db.user.findUnique({
    where: {
      id,
    },
    include: {
      posts: true, // Include all posts related to this user
    },
  })
  if (!user) {
    return c.notFound()
  }
  return c.json({ data: userView(user) })
})

.post('/', zValidator('json', userPostSchema), async (c: Context) => {
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

  // TODO build log redaction layer instead (could this be async?)
  const logData = Object.assign({}, userData);
  delete logData.salt;
  delete logData.hash;
  log.info('creating user', logData)

  try {
    const result = await db.user.create({data: userData})
    const userPostResultView = userView(result)
    log.info('Created user', userPostResultView)
    // const lastModified = await setLastModified('user', result.updatedAt)
    const lastModified = await setLastModified('user')
    c.header('Last-Modified', lastModified)
    return c.json({ data: userPostResultView })

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
        id: payload.id,
      },
      data: {
        name: payload.name,
        phone: payload.phone,
      },
    })
    const userPatchResultView = userView(result)
    log.info('Created user', userPatchResultView)
    // todo get value and set header

    log.info('xxx delete me', typeof result.createdAt)

    await setLastModified('user')
    return c.json({ data: userPatchResultView })

  // deno-lint-ignore no-explicit-any
  } catch (err: any) {
    if (err.code === 'P2002') { // err.target === ['email']
      log.info('patch user: unique constraint failed', err)
      return c.json({ error: 'Unique constraint failed' }, 429)
    }
    log.warn('Error creating user', err)
    throw(err)
    // TODO test various error conditions, logging and output for failure modes
    // return c.json({ error: 'Error creating user' }, 500)
  }
})
