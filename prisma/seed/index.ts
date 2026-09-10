import '@std/dotenv/load'
import { getDB } from '@mod/db'
import roleSeed from './role.ts'
import userSeed from './user.ts'
import countrySeed from './country.ts'

Deno.env.set('LOG_DB_QUERIES', 'false')
Deno.env.set('LOG_DB_INFO', 'false')
const db = getDB()
console.log(`begin seeding...`)
await countrySeed(db)
await roleSeed(db)
await userSeed(db)

console.log(`seeding finished.`)
await db.$disconnect().then(() => {
  console.log('Disconnected from database.')
  Deno.exit(0)
}).catch((err) => {
  console.error('Error disconnecting from database:', err)
})
