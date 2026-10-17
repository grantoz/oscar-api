// note, always load dotenv first so that other imports in the dependency graph can use it
import 'dotenv/config'
// must be imported before the CJS deps it instruments (pg, redis, pino)
import './instrumentation.ts'
import { Context, Hono } from 'hono'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { openAPIRouteHandler } from 'hono-openapi'
import { db } from '@mod/db'
import { api } from './api/mod.ts' // api  routes
import { auth } from './auth/mod.ts' // auth routes
import { flushLogs, kv, log } from '@util'
import { httpInstrumentationMiddleware } from '@hono/otel'
import { shutdownOtel, USE_OTEL } from './instrumentation.ts'
import process from 'node:process'

process.env.TZ = 'UTC'

const app = new Hono()
app.use(logger())
// @hono/node-server is ESM, so node:http cannot be auto-instrumented; the
// Hono middleware provides the HTTP server spans/metrics instead.
if (USE_OTEL) app.use('*', httpInstrumentationMiddleware())
// TODO start api, queue or event
// TODO app secret and storage
// TODO validate app config / env vars
// TODO use middleware to set api version header to v1 IF NOT PRESENT

// auth routes e.g. login, logout, refresh
app.route('/auth', auth)

// api routes
app.route('/api', api)

app
  .get('/', (c: Context) => {
    log.info('Welcome URL was hit')
    return c.text('Welcome to the User API!')
  })

// openapi spec
// https://hono.dev/examples/hono-openapi
app.get(
  '/openapi',
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: 'Oscar API',
        version: '1.0.0',
        description: 'Oscar user API',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  }),
)
// .options("*", (rev: RequestEvent) => {
//   rev.response.header().append("Access-Control-Allow-Methods", "GET, POST, DELETE");
//   rev.response.header().append('access-control-allow-origin', '*')
//   return "OK"
// })
// .onError((err, _rev) => {
//   return "sorry, it's broken\n"
// })

// Other middleware here?

let server: ReturnType<typeof serve> | undefined
let shuttingDown = false

const start = async () => {
  // TODO move this into a general utils file that is always included for runtime and non-runtime tests
  // deno-lint-ignore no-explicit-any
  ;(BigInt.prototype as any).toJSON = function () {
    return this.toString()
  }

  const port = parseInt(process.env['PORT'] || '8000')
  log.info(`Starting server on port ${port}...`)

  try {
    server = serve({ fetch: app.fetch, port }, (info) => {
      log.info(`Server listening on port ${info.port}`)
    })
  } catch (err) {
    log.error({ err }, 'start: error')
    await db.$disconnect()
    process.exit(1)
  }
}

const exit = async (status: number) => {
  // Signals may be delivered more than once (e.g. node --watch forwards the
  // terminal's SIGINT to the child), so shutdown must be idempotent.
  if (shuttingDown) return
  shuttingDown = true

  // Safety net: never let a stuck resource keep the process (and terminal) alive.
  const forceExit = setTimeout(() => process.exit(status), 5000)
  forceExit.unref()

  server?.close()

  try {
    await db.$disconnect()
  } catch (err) {
    log.error({ err }, 'shutdown: failed to disconnect db')
  }

  try {
    await kv.close()
  } catch (err) {
    log.error({ err }, 'shutdown: failed to close kv')
  }

  await shutdownOtel()

  await flushLogs()
  clearTimeout(forceExit)
  process.exit(status)
}

process.on('unhandledRejection', async (err) => {
  log.error({ err }, 'unhandledRejection')
  await exit(1)
})

process.on('SIGINT', async () => {
  log.info('Received SIGINT, stopping.')
  await exit(0)
})

process.on('SIGTERM', async () => {
  log.info('Received SIGTERM, stopping.')
  await exit(0)
})

void start()
