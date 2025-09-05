import { Context, Hono } from '@hono'
import { db, Prisma, Post } from '@mod/db'
import { log, meta, paged, pageOptions } from '../util/mod.ts'
import { zValidator } from '@hono/zod-validator'
import { z } from '@zod'

const userPatchSchema = z.object({
  extId: z.string(),
  name: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  passwordConfirm: z.string().optional(),
}).refine(schema => {
  schema.password === schema.passwordConfirm
}, {
  message: 'Password and password confirmation must match', 
})
type userPatch = z.infer<typeof userPatchSchema>


const postPostSchema = z.object({
  title: z.string(),
  content: z.string(),
  userId: z.int(),
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
  try {
    const result = await db.post.create({
      data: {
        title: payload.title,
        content: payload.content,
        userId: payload.userId,
      },
    })
  
    return c.json({ data: result })
    
  // deno-lint-ignore no-explicit-any
  } catch (err: any) {
    if (err.code === 'P2002') {
      log.warn('create post: unique constraint failed', err)
      // console.warn('Create user: Unique constraint failed', err)
      return c.json({ error: 'unique constraint failed' }, 422)
    }
    log.warn('error creating post', err)
    return c.json({ error: 'error creating post' }, 500)
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
