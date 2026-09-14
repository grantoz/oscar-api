import { Context, Hono } from '@hono'
import { db, Post, User } from '@mod/db'
import { log, meta, pageOptions, pagination } from '@util'
import { describeRoute, resolver, validator as zValidator } from 'hono-openapi'
import type { DescribeRouteOptions } from 'hono-openapi'
import { z } from '@zod'

const uuidIdSchema = z.object({
  id: z.uuidv7(),
})

const postPatchSchema = z.object({
  id: z.uuidv7(),
  title: z.string(),
  content: z.string(),
})
type postPatch = z.infer<typeof postPatchSchema>

const postPostSchema = z.object({
  title: z.string(),
  content: z.string(),
})
type postPost = z.infer<typeof postPostSchema>

const postSchema = z.object({
  id: z.uuidv7(),
  title: z.string(),
  content: z.string().nullable(),
  published: z.boolean(),
  userId: z.uuidv7(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
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

const postListResponseSchema = z.object({
  data: z.array(postSchema),
  meta: metaSchema,
})

const postResponseSchema = z.object({
  data: postSchema,
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

export const post = new Hono()
  .get(
    '/',
    describeRoute({
      tags: ['post'],
      summary: 'List posts',
      security: [{ bearerAuth: [] }],
      parameters: paginationParams,
      responses: {
        200: {
          description: 'List of posts',
          content: {
            'application/json': {
              schema: resolver(postListResponseSchema),
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
      const options = pageOptions(c.req.query() as pagination)
      const items: Post[] = await db.post.findMany(options)
      c.res.headers.append('cache-control', 'max-age=10')
      return c.json({ data: items, meta: meta(items) })
    },
  )
  .get(
    '/:id',
    describeRoute({
      tags: ['post'],
      summary: 'Get a post by id',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Post',
          content: {
            'application/json': {
              schema: resolver(postResponseSchema),
            },
          },
        },
        404: {
          description: 'Post not found',
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
    zValidator('param', uuidIdSchema),
    async (c: Context) => {
      const { id } = c.req.valid('param' as never)
      const item: Post | null = await db.post.findUnique({
        where: {
          id,
        },
      })
      if (!item) {
        return c.notFound()
      }
      return c.json({ data: item })
    },
  )
  .post(
    '/',
    describeRoute({
      tags: ['post'],
      summary: 'Create a post',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Created post',
          content: {
            'application/json': {
              schema: resolver(postResponseSchema),
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
        500: {
          description: 'Error creating post',
          content: {
            'application/json': {
              schema: resolver(errorSchema),
            },
          },
        },
      },
    }),
    zValidator('json', postPostSchema),
    async (c: Context) => {
      const payload: postPost = c.req.valid('json' as never)
      const authUser = c.get('authUser') as User

      try {
        const result = await db.post.create({
          data: {
            title: payload.title,
            content: payload.content,
            userId: authUser.id,
          },
        })
        log.info('created Post DB record', { actorId: authUser.id, result })
        return c.json({ data: result })

        // deno-lint-ignore no-explicit-any
      } catch (err: any) {
        if (err.code === 'P2002') {
          log.warn('error create post: unique constraint failed')
          return c.json({ error: 'unique constraint failed' }, 422)
        }
        log.warn('error creating post')
        return c.json({ error: 'error creating post' }, 500)
      }
    },
  )
  // TODO move ID to the path parameter
  .patch(
    '/',
    describeRoute({
      tags: ['post'],
      summary: 'Update a post',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Updated post',
          content: {
            'application/json': {
              schema: resolver(postResponseSchema),
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
    zValidator('json', postPatchSchema),
    async (c: Context) => {
      const payload: postPatch = c.req.valid('json' as never)
      const authUser = c.get('authUser') as User
      try {
        const result = await db.post.update({
          where: {
            id: payload.id,
            userId: authUser.id,
          },
          data: {
            title: payload.title,
            content: payload.content,
          },
        })
        log.info('updated post', { actorId: authUser.id, result })
        return c.json({ data: result })

        // deno-lint-ignore no-explicit-any
      } catch (err: any) {
        if (err.code === 'P2025') {
          log.info('error updating post: record not found', { id: payload.id })
          return c.notFound()
        }
        log.error('error updating post')
        return c.json({ error: 'error updating post' }, 500)
      }
    },
  )
