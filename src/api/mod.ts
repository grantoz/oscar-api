// import { etag } from '@hono/etag'
import { validateJwtMiddleware } from '@middleware'
import { country } from './country.ts'
import { post } from './post.ts'
import { user } from './user.ts'
import { Hono } from '@hono'
export const api = new Hono()
  .use(validateJwtMiddleware)
  // .use(etag()) // TODO move this to GET routes, e.g. app.get('/data', etag(), async (c) => { ONLY
  .route('/user', user) // Handle /user GET routes
  .route('/post', post) // Handle /post/* routes
  .route('/country', country) // Handle /country/* routes

// TODO middleware to check permissions, roles etc
// TODO filtering
