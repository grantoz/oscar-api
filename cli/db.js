// note, always load dotenv first so that other imports in the dependency graph can use it
import '@std/dotenv/load'
import { Client } from '@db/postgres'

// const test = Deno.args.includes('--test')
const dbUrl = Deno.env.get('DATABASE_URL')
const match = dbUrl.match(
  /postgresql:\/\/(?<user>[^:]+):(?<pass>[^@]+)@(?<host>[^:]+):(?<port>\d+)\/(?<db>[^?]+)/,
)

// let dbName = match?.groups?.db
// if (test) {
//   dbName = `test_${dbName}`
//   console.log(`Running in test mode, using database name: ${dbName}`)
// }

const db = new Client({
  user: match.groups.user,
  password: match.groups.pass,
  database: 'postgres',
  hostname: match.groups.host,
  port: match.groups.port,
})

try {
  await db.connect()
  // const result = await db.queryObject('SELECT 1 as result');
  // console.log('Connected to Postgres:', result.rows[0].result);
} catch (e) {
  console.error(`Error connecting to postgres:`, e.message)
  Deno.exit()
}

export { db, match }
