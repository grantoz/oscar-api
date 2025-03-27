// const user = new Hono().basePath('/user')

// user.get('/', async (c: Context) => {
//   log.info(c.req.query())
//   log.debug('dummy debug log')
//   const options = parseSortOptions(c.req.query() as pagedQuery)
//   const users = await db.user.findMany(options)
//   c.res.headers.append('cache-control', 'max-age=10')
//   return c.json({ data: users, meta: meta(users) })
//   // return c.text('List Users') // GET /user
// })
