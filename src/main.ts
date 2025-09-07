// note, always load dotenv first so that other imports in the dependency graph can use it
import 'jsr:@std/dotenv/load'
import { Context, Hono } from '@hono'
import { logger } from '@hono/logger'
import { db } from '@mod/db'
import { log } from './util/mod.ts'

import { api } from './api/mod.ts'
import { auth, validateJwtMiddleware } from './auth/mod.ts'

const fooMiddleware = async (_c: Context, next: () => Promise<void>) => {
  log.info('foo middleware invoked')
  await next()
}

const app = new Hono();
app.use(logger())
app.use(fooMiddleware)
// TODO start api, queue or event
// TODO app secret and storage
// TODO validate app config / env vars
// TODO use middleware to set api version header to v1 IF NOT PRESENT
app.use(validateJwtMiddleware) // Apply validateJwt middleware to /api/* routes
app.route('/api', api)
app.route('/auth', auth)

log.info('a');

// TODO hono openapi middleware
// https://hono.dev/examples/hono-openapi

app
  .get('/', (c: Context) => {
    log.info('Welcome URL was hit')
    return c.text('Welcome to the User API!')
  })
  // .options("*", (rev: RequestEvent) => {
  //   rev.response.header().append("Access-Control-Allow-Methods", "GET, POST, DELETE");
  //   rev.response.header().append('access-control-allow-origin', '*')
  //   return "OK"
  // })
  // .onError((err, _rev) => {
  //   log.error(err)
  //   return "sorry, it's broken\n"
  // })

// Other middleware here?

const start = async () => {
  // deno-lint-ignore no-explicit-any
  ;(BigInt.prototype as any).toJSON = function () {
    return this.toString()
  }

  // TODO add checks for required env vars
  // TODO add a check that the db is connected

  try {
    console.log(app.routes)
    Deno.serve(app.fetch)
  } catch (err) {
    log.error(err)
    await db.$disconnect()
    Deno.exit(1)
  }
}

globalThis.addEventListener('unhandledRejection', async (err) => {
  log.error(err)
  await db.$disconnect()
  Deno.exit(1)
})

Deno.addSignalListener('SIGINT', async () => {
  log.info('Received SIGINT, stopping.')
  await db.$disconnect()
  Deno.exit()
})

start().then(async () => {
  await db.$disconnect()
})
