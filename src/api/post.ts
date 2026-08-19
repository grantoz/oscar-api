import { Context, Hono } from '@hono'
import { db, Post, User } from '@mod/db'
import { log, meta, pagination, pageOptions } from '@util'
import { zValidator } from '@hono/zod-validator'
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

export const post = new Hono()
.get('/', async (c: Context) => {
  // log.info(c.req.query())
  const options = pageOptions(c.req.query() as pagination)
  const items: Post[] = await db.post.findMany(options)
  c.res.headers.append('cache-control', 'max-age=10')
  return c.json({ data: items, meta: meta(items) })
})

.get('/:id', zValidator('param', uuidIdSchema), async (c: Context) => {
  const { id } = c.req.valid('param' as never);
  const item: Post|null = await db.post.findUnique({
    where: {
      id,
    },
  })
  if (!item) {
    return c.notFound()
  }
  return c.json({ data: item })
})

.post('/', zValidator('json', postPostSchema), async (c: Context) => {

  const payload: postPost = c.req.valid('json' as never)
  log.info('creating post', payload)

  const user = c.get('authUser') as User
  log.info('creating post for user', { userId: user.id }) // TODO PII LEAK

  try {
    const result = await db.post.create({
      data: {
        title: payload.title,
        content: payload.content,
        userId: user.id,
      },
    })
    log.info('created post', result)
    return c.json({ data: result })

  // deno-lint-ignore no-explicit-any
  } catch (err: any) {
    if (err.code === 'P2002') {
      log.warn('create post: unique constraint failed', err)
      return c.json({ error: 'unique constraint failed' }, 422)
    }
    log.warn('error creating post', err)
    return c.json({ error: 'error creating post' }, 500)
  }
})

// TODO move ID to the path parameter
.patch('/', zValidator('json', postPatchSchema), async (c: Context) => {
  const payload: postPatch = c.req.valid('json' as never)
  log.info('updating post', payload)
  try {
    const result = await db.post.update({
      where: {
        id: payload.id,
      },
      data: {
        title: payload.title,
        content: payload.content,
      },
    })
    log.info('updated post', result)
    return c.json({ data: result })

  // deno-lint-ignore no-explicit-any
  } catch (err: any) {
    log.error('error updating post', err)
    throw(err)
  }
})
