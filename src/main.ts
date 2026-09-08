// note, always load dotenv first so that other imports in the dependency graph can use it
import '@std/dotenv/load'
import { Context, Hono } from '@hono'
import { logger } from '@hono/logger'
import { db } from '@mod/db'
import { api } from './api/mod.ts' // api  routes
import { auth } from './auth/mod.ts' // auth routes
import { kv, log } from '@util'
import process from 'node:process'

process.env.TZ = Deno.env.get('TZ')

const app = new Hono()
app.use(logger())
// TODO start api, queue or event
// TODO app secret and storage
// TODO validate app config / env vars
// TODO use middleware to set api version header to v1 IF NOT PRESENT

// auth routes e.g. login, logout, refresh
app.route('/auth', auth)

// api routes
app.route('/api', api)

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
//   return "sorry, it's broken\n"
// })

// Other middleware here?

const start = async () => {
  // TODO move this into a general utils file that is always included for runtime and non-runtime tests
  // deno-lint-ignore no-explicit-any
  ;(BigInt.prototype as any).toJSON = function () {
    return this.toString()
  }

  const port = parseInt(Deno.env.get('PORT') || '8000')
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

const exit = async (status: number) => {
  await db.$disconnect()
  await kv.close()
  Deno.exit(status)
}

globalThis.addEventListener('unhandledRejection', async (err) => {
  log.error('unhandledRejection', { err })
  await exit(1)
})

Deno.addSignalListener('SIGINT', async () => {
  log.info('Received SIGINT, stopping.')
  await exit(0)
})

Deno.addSignalListener('SIGTERM', async () => {
  log.info('Received SIGTERM, stopping.')
  await exit(0)
})

start().then(async () => {
  await db.$disconnect()
})
