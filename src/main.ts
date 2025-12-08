// note, always load dotenv first so that other imports in the dependency graph can use it
import '@std/dotenv/load'
import { Context, Hono } from '@hono'
import { logger } from '@hono/logger'
import { db } from '@mod/db'
import { api } from './api/mod.ts'
import { auth } from './auth/mod.ts'
import { log } from './util/mod.ts'
import process from "node:process"

process.env.TZ = Deno.env.get("TZ")

// const fooMiddleware = async (_c: Context, next: () => Promise<void>) => {
//   log.info('foo middleware invoked')
//   await next()
// }

const app = new Hono();
app.use(logger())
// app.use(fooMiddleware)
// TODO start api, queue or event
// TODO app secret and storage
// TODO validate app config / env vars
// TODO use middleware to set api version header to v1 IF NOT PRESENT
app.route('/api', api)///.use(etag())
app.route('/auth', auth)

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

  const port = Number(Deno.env.get('PORT') || 8000)
  log.info(`Starting server on port ${port}...`)

  try {
    // console.log(app.routes)
    Deno.serve({ port }, app.fetch)
  } catch (err) {
    log.error('start: error', { err })
    await db.$disconnect()
    Deno.exit(1)
  }
}

globalThis.addEventListener('unhandledRejection', async (err) => {
  log.error('unhandledRejection', { err })
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
