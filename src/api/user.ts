import { Context, Hono } from '@hono'
import { db, Prisma } from '@mod/db'
import { log, meta, pageOptions, pagination } from '@util'
import { zValidator } from '@hono/zod-validator'
import { z } from '@zod'
import { genSalt, hashPassword } from '@/util/user.ts'
import { userView } from '@/view/user.ts'
import { getLastModified, setLastModified } from '@/util/lastModified.ts'
import { validate } from '@util'
import { etag } from '@hono/etag'

// TODO add email verification, phone verification etc
// TODO add role based access control, admin user etc

const uuidIdSchema = z.object({
  id: z.uuidv7(),
})

const userSchema = z.object({
  // id: z.uuidv7(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  passwordConfirm: z.string().optional(),
})

const passwordMatch = (
  schema: { password?: string; passwordConfirm?: string },
) => {
  if (schema.password || schema.passwordConfirm) {
    return schema.password === schema.passwordConfirm
  }
  return true
}

const MAX_PROPS_SIZE = 2048 // 2kb

const userPropsSchema = z.custom<Prisma.InputJsonValue>().superRefine(
  (props, ctx) => {
    if (props === undefined) {
      return
    }
    const bytes = new TextEncoder().encode(JSON.stringify(props)).length
    if (bytes > MAX_PROPS_SIZE) {
      ctx.addIssue({
        code: 'custom',
        message:
          `props must be at most ${MAX_PROPS_SIZE} bytes, received ${bytes}`,
      })
    }
  },
)

const userPatchSchema = userSchema
  .extend({
    props: userPropsSchema.optional(),
  })
  .strict()
  .refine(passwordMatch, {
    message: 'Password and password confirmation must match',
  })
type userPatchPayload = z.infer<typeof userPatchSchema>

// user post must have an email, so re-create is as non-optional
const userPostSchema = userSchema
  .omit({ email: true })
  .extend({ email: z.email() })
  .strict()
  .refine(passwordMatch, {
    message: 'Password and password confirmation must match',
  })
type userPostPayload = z.infer<typeof userPostSchema>

export const user = new Hono()
  .get('/', etag(), async (c: Context) => {
    const options = pageOptions(c.req.query() as pagination)
    const users = await db.user.findMany(options)
    // TODO cache headers
    c.header('last-modified', await getLastModified('user'))
    return c.json({ data: users.map(userView), meta: meta(users) })
  })
  // TODO generalise ID fetch routes
  .get('/:id', etag(), validate('param', uuidIdSchema), async (c: Context) => {
    /**
     * Extracts the validated `id` parameter from the request.
     * The `as never` type assertion bypasses TypeScript's strict type checking for the validator target,
     * allowing the zValidator to properly infer and validate the parameter against the defined schema.
     * This is a common pattern in Hono when using zValidator to ensure the validation result is correctly typed.
     */
    const { id } = c.req.valid('param' as never)
    const user = await db.user.findUnique({
      where: {
        id,
      },
    })
    if (!user) {
      return c.notFound()
    }
    c.header('last-modified', user.updatedAt.toUTCString())
    return c.json({ data: userView(user) })
  })
  .post('/', zValidator('json', userPostSchema), async (c: Context) => {
    const payload: userPostPayload = c.req.valid('json' as never)
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

    const logData = Object.assign({}, userData)
    delete logData.salt
    delete logData.hash
    log.info('creating user', logData)

    try {
      const result = await db.user.create({ data: userData })
      const userPostResultView = userView(result)
      log.info('created user', userPostResultView)
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
      throw err
    }
  })
  // .patch('/', zValidator('json', userPatchSchema), async (c: Context) => {

  .patch(
    '/:id',
    validate('param', uuidIdSchema),
    zValidator('json', userPatchSchema),
    async (c: Context) => {
      const { id } = c.req.valid('param' as never)
      const payload: userPatchPayload = c.req.valid('json' as never)
      log.info('updating user', { id, payload })

      const userData: Prisma.UserUpdateInput = {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        props: payload.props,
      }
      if (payload.password) {
        userData.salt = genSalt()
        userData.hash = await hashPassword(payload.password, userData.salt)
      }

      const logData = Object.assign({}, userData)
      delete logData.salt
      delete logData.hash
      logData.id = id
      log.info('updating user', logData)

      try {
        const result = await db.user.update({
          where: {
            id,
          },
          data: userData,
        })
        const userPatchResultView = userView(result)
        log.info('updated user', userPatchResultView)
        await setLastModified('user') // TODO this could be rolled into metric emission
        return c.json({ data: userPatchResultView })

        // deno-lint-ignore no-explicit-any
      } catch (err: any) {
        if (err.code === 'P2025') { // err.target === ['email']
          log.info('patch user: entity not found')
          return c.notFound()
        } else if (err.code === 'P2002') { // err.target === ['email']
          log.info('patch user: unique constraint failed', err)
          return c.json({ error: 'Unique constraint failed' }, 429)
        }
        log.warn('error updating user', err)
        throw err
        // TODO test various error conditions, logging and output for failure modes
        // return c.json({ error: 'Error creating user' }, 500)
      }
    },
  )
