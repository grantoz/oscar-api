// import { etag } from '@hono/etag'
import { Context } from '@hono'
import { log } from '@util'

export const fooMiddleware = async (_c: Context, next: () => Promise<void>) => {
  log.info('foo middleware invoked')
  await next()
}
