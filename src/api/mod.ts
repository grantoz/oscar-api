// import { Context, Hono } from '@hono'
// // import user

// export const route: any(app: Hono) => {
//   app.route('/user', user) // Handle /user/* routes
// }

import { country } from './country.ts'
import { post } from './post.ts'
import { user } from './user.ts'
import { Hono } from '@hono'
export const api = new Hono()
  .route('/user', user) // Handle /user/* routes
  .route('/post', post) // Handle /post/* routes
  .route('/country', country) // Handle /country/* routes
