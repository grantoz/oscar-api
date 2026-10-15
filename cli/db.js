// note, always load dotenv first so that other imports in the dependency graph can use it
import 'dotenv/config'
import pg from 'pg'

// const test = process.argv.includes('--test')
const dbUrl = process.env['DATABASE_URL']
const match = dbUrl.match(
  /postgresql:\/\/(?<user>[^:]+):(?<pass>[^@]+)@(?<host>[^:]+):(?<port>\d+)\/(?<db>[^?]+)/,
)

// let dbName = match?.groups?.db
// if (test) {
//   dbName = `test_${dbName}`
//   console.log(`Running in test mode, using database name: ${dbName}`)
// }

const db = new pg.Client({
  user: match.groups.user,
  password: match.groups.pass,
  database: 'postgres',
  host: match.groups.host,
  port: Number(match.groups.port),
})

try {
  await db.connect()
  // const result = await db.query('SELECT 1 as result');
  // console.log('Connected to Postgres:', result.rows[0].result);
} catch (e) {
  console.error(`Error connecting to postgres:`, e.message)
  process.exit()
}

export { db, match }
