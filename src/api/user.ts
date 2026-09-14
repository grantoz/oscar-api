import { Context, Hono } from '@hono'
import { db, Prisma } from '@mod/db'
import { log, meta, pageOptions, pagination } from '@util'
import { describeRoute, resolver, validator as zValidator } from 'hono-openapi'
import type { DescribeRouteOptions } from 'hono-openapi'
import { z } from '@zod'
import { hashPassword } from '@/util/user.ts'
import { userView } from '@/view/user.ts'
import { getLastModified, setLastModified } from '@/util/lastModified.ts'
import { validate } from '@util'
import { etag } from '@hono/etag'

// TODO add email verification, phone verification etc
// TODO add role based access control, admin user etc

const uuidIdSchema = z.object({
  id: z.uuidv7(),
})

// note: ID cannot be passed in the payload body for patch or post
const userBaseSchema = z.object({
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

const userPatchSchema = userBaseSchema
  .extend({
    props: userPropsSchema.optional(),
  })
  .strict()
  .refine(passwordMatch, {
    message: 'Password and password confirmation must match',
  })
type userPatchPayload = z.infer<typeof userPatchSchema>

// user post must have an email, so re-create is as non-optional
const userPostSchema = userBaseSchema
  .omit({ email: true })
  .extend({ email: z.email() })
  .strict()
  .refine(passwordMatch, {
    message: 'Password and password confirmation must match',
  })
type userPostPayload = z.infer<typeof userPostSchema>

const userViewSchema = z.object({
  id: z.uuidv7(),
  name: z.string().nullable(),
  email: z.string(),
  phone: z.string().nullable(),
  role: z.string(),
  props: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  posts: z.array(z.unknown()).optional(),
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

const userListResponseSchema = z.object({
  data: z.array(userViewSchema),
  meta: metaSchema,
})

const userResponseSchema = z.object({
  data: userViewSchema,
})

const paginationParams: NonNullable<DescribeRouteOptions['parameters']> = [
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

export const user = new Hono()
  .get(
    '/',
    describeRoute({
      tags: ['user'],
      summary: 'List users',
      security: [{ bearerAuth: [] }],
      parameters: paginationParams,
      responses: {
        200: {
          description: 'List of users',
          content: {
            'application/json': {
              schema: resolver(userListResponseSchema),
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
    etag(),
    async (c: Context) => {
      const options = pageOptions(c.req.query() as pagination)
      const users = await db.user.findMany(options)
      // TODO cache headers
      c.header('last-modified', await getLastModified('user'))
      return c.json({ data: users.map(userView), meta: meta(users) })
    },
  )
  // TODO generalise ID fetch routes
  .get(
    '/:id',
    describeRoute({
      tags: ['user'],
      summary: 'Get a user by id',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'User',
          content: {
            'application/json': {
              schema: resolver(userResponseSchema),
            },
          },
        },
        404: {
          description: 'User not found',
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
    etag(),
    validate('param', uuidIdSchema),
    async (c: Context) => {
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
    },
  )
  .post(
    '/',
    describeRoute({
      tags: ['user'],
      summary: 'Create a user',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Created user',
          content: {
            'application/json': {
              schema: resolver(userResponseSchema),
            },
          },
        },
        422: {
          description: 'Unique constraint failed',
          content: {
            'application/json': {
              schema: resolver(errorSchema),
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
    zValidator('json', userPostSchema),
    async (c: Context) => {
      const payload: userPostPayload = c.req.valid('json' as never)
      const userData: Prisma.UserCreateInput = {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        props: {}, // Prisma.JsonNull, // or {} if you prefer
      }
      if (payload.password) {
        userData.hash = await hashPassword(payload.password)
      }

      const authUser = c.get('authUser')

      try {
        const result = await db.user.create({ data: userData })
        log.info('created user', { actorId: authUser.id, subjectId: result.id })
        const lastModified = await setLastModified('user')
        c.header('Last-Modified', lastModified)
        return c.json({ data: userView(result) })

        // deno-lint-ignore no-explicit-any
      } catch (err: any) {
        if (err.code === 'P2002') {
          // log.warn('create user: unique constraint failed', err)
          log.warn('create user: unique constraint failed')
          return c.json({ error: 'unique constraint failed' }, 422)
        }
        log.warn('Error creating user')
        throw err
      }
    },
  )
  // .patch('/', zValidator('json', userPatchSchema), async (c: Context) => {

  .patch(
    '/:id',
    describeRoute({
      tags: ['user'],
      summary: 'Update a user',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Updated user',
          content: {
            'application/json': {
              schema: resolver(userResponseSchema),
            },
          },
        },
        404: {
          description: 'User not found',
        },
        429: {
          description: 'Unique constraint failed',
          content: {
            'application/json': {
              schema: resolver(errorSchema),
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
    validate('param', uuidIdSchema),
    zValidator('json', userPatchSchema),
    async (c: Context) => {
      const { id } = c.req.valid('param' as never)
      const payload: userPatchPayload = c.req.valid('json' as never)

      const userData: Prisma.UserUpdateInput = {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        props: payload.props,
      }
      if (payload.password) {
        userData.hash = await hashPassword(payload.password)
      }

      try {
        const result = await db.user.update({
          where: {
            id,
          },
          data: userData,
        })
        const view = userView(result)
        log.info('updated user', { id, user: view })
        await setLastModified('user') // TODO this could be rolled into metric emission
        return c.json({ data: view })

        // deno-lint-ignore no-explicit-any
      } catch (err: any) {
        if (err.code === 'P2025') {
          log.info('patch user: record not found', { id })
          return c.notFound()
        } else if (err.code === 'P2002') {
          log.info('patch user: unique constraint failed', { id })
          return c.json({ error: 'Unique constraint failed' }, 429)
        }
        log.warn('error updating user')
        return c.json({ error: 'error updating user' }, 500)
      }
    },
  )
