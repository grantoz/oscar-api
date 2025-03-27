// note, always load dotenv first so that other imports in the dependency graph can use it
import 'jsr:@std/dotenv/load'
import { Context, Hono } from '@hono'
import { db } from '@mod/db'
// import cors from '@nhttp/nhttp/cors'
import * as log from '@std/log'

log.setup({
  handlers: {
    default: new log.ConsoleHandler('DEBUG', {
      formatter: log.formatters.jsonFormatter,
      useColors: true,
    }),
  },
})

interface pagedQuery {
  _page?: string
  _limit?: string
  _sort?: string
  _order?: 'asc' | 'desc' | 'ASC' | 'DESC'
}

interface queryOptions {
  orderBy?: { [key: string]: string }
  skip?: number
  take?: number
  where?: { [key: string]: string }
}

const parseSortOptions = (query: pagedQuery): object => {
  const options: queryOptions = {}
  if (query._sort && query._order) {
    options.orderBy = {
      [query._sort]: query._order.toLowerCase(),
    }
  }
  if (query._page && query._limit) {
    options.skip = (parseInt(query._page) - 1) * parseInt(query._limit)
    options.take = parseInt(query._limit)
  }
  return options
}

// TODO type
const meta = (records: any[]) => {
  return {
    length: records.length,
    page: 1,
    perPage: 10,
    numPages: Math.ceil(records.length / 10)
  }
}

const app = new Hono();
// const app = nhttp()
// app.use(logger())
// app.use(cors())

// TODO use middleware to set api version header to v1 IF NOT PRESENT

// TODO move to src/api/user.ts
const user = new Hono().basePath('/user')
user.get('/', async (c: Context) => {
  log.info(c.req.query())
  log.debug('dummy debug log')
  const options = parseSortOptions(c.req.query() as pagedQuery)
  const users = await db.user.findMany(options)
  c.res.headers.append('cache-control', 'max-age=10')
  return c.json({ data: users, meta: meta(users) })
  // return c.text('List Users') // GET /user
})

user.get('/:id{[0-9]+}', async (c: Context) => {
  const { id } = c.req.param()
  console.log('got id', id)
  const user = await db.user.findUnique({
    where: {
      id: Number(id),
    },
  })
  return c.json({ data: user })
})

// user.post('/', async (c: Context) => {
//   const { name, email } = c.req.valid('json')
//   const result = await db.user.create({
//     data: {
//       name,
//       email,
//     },
//   })
//   return c.json({ data: result })
// })


// user.get('/foo', (c: Context) => c.text('Foo')) // GET /user/foo

// user.post('/', (c: Context) => c.text('Create User')) // POST /user


app.route('/', user) // Handle /user/* routes

app
  .get('/', (c: Context) => {
    log.info('Welcome URL was hit')
    log.info('dummy log message')
    return c.text('Welcome to the User API!')
  })
  // .delete('/user/:id', async (rev: RequestEvent) => {
  //   const { id } = rev.params
  //   const user = await db.user.delete({
  //     where: {
  //       id: Number(id),
  //     },
  //   })
  //   return user
  // })
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
  try {
    // app.listen(3000)
    Deno.serve(app.fetch)
  } catch (err) {
    console.error(err)
    // app.log.error(err);
    await db.$disconnect()
    Deno.exit(1)
  }
}

globalThis.addEventListener('unhandledRejection', async (err) => {
  console.log(err)
  await db.$disconnect()
  Deno.exit(1)
})

Deno.addSignalListener('SIGINT', async () => {
  console.log('Received SIGINT, stopping.')
  await db.$disconnect()
  Deno.exit()
})

start().then(async () => {
  await db.$disconnect()
})
