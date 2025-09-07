import { Context, Hono } from '@hono'
import { db, Post, User } from '@mod/db'
import { log, meta, paged, pageOptions } from '../util/mod.ts'
import { zValidator } from '@hono/zod-validator'
import { z } from '@zod'

const postPatchSchema = z.object({
  title: z.string(),
  content: z.string(),
  extId: z.uuidv4(),
})
type postPatch = z.infer<typeof postPatchSchema>

const postPostSchema = z.object({
  title: z.string(),
  content: z.string(),
})
type postPost = z.infer<typeof postPostSchema>

export const post = new Hono()
.get('/', async (c: Context) => {
  log.info(c.req.query())
  const options = pageOptions(c.req.query() as paged)
  const items: Post[] = await db.post.findMany(options)
  c.res.headers.append('cache-control', 'max-age=10')
  return c.json({ data: items, meta: meta(items) })
})

.get('/:id{[0-9]+}', async (c: Context) => {
  const { id } = c.req.param()
  log.info('got id', id)
  const item: Post|null = await db.post.findUnique({
    where: {
      id: Number(id),
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
  log.info('creating post for user', user?.email, user?.id)
  if (!user?.id) {
    log.warn('create post: no user in context')
    return c.json({ error: 'Not Authorized' }, 401)
  }

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

.patch('/', zValidator('json', postPatchSchema), async (c: Context) => {
  const payload: postPatch = c.req.valid('json' as never)
  log.info('updating post', payload)
  try {
    const result = await db.post.update({
      where: {
        extId: payload.extId,
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
    // return c.json({ error: 'Error creating user' }, 500)
  }
})
