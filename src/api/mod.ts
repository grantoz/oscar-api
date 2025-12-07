import { etag } from '@hono/etag'
import { validateJwtMiddleware } from '../auth/mod.ts'
import { country } from './country.ts'
import { post } from './post.ts'
import { user } from './user.ts'
import { Hono } from '@hono'
export const api = new Hono()
  .use(validateJwtMiddleware)
  .use(etag())
  .route('/user', user) // Handle /user/* routes
  .route('/post', post) // Handle /post/* routes
  .route('/country', country) // Handle /country/* routes
