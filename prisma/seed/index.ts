import 'dotenv/config'
import { getDB, PrismaClient } from '@mod/db'
import { countrySeeder } from './country.ts'
import { roleSeeder } from './role.ts'
import { userSeeder } from './user.ts'

type AppEnv = 'dev' | 'test' | 'ci' | 'staging' | 'uat' | 'sandbox' | 'prod'
const env = process.env['APP_ENV'] as AppEnv

export interface Seeder {
  name: string
  prod: (db: PrismaClient) => Promise<void>
  dev: (db: PrismaClient) => Promise<void>
  always: (db: PrismaClient) => Promise<void>
}

// Higher-order execution runner
export async function runSeeder(
  seeder: Seeder,
  env: AppEnv,
  db: PrismaClient,
): Promise<void> {
  const isProdLike = ['prod', 'uat', 'sandbox'].includes(env)
  console.log(`Running ${seeder.name} for ${env}...`)

  await seeder.always(db)
  if (isProdLike) {
    await seeder.prod(db)
  } else {
    await seeder.dev(db)
  }
}

process.env['LOG_DB_QUERIES'] = 'false'
process.env['LOG_DB_INFO'] = 'false'
const db = getDB()
console.log(`begin seeding...`)

await runSeeder(countrySeeder, env, db)
await runSeeder(roleSeeder, env, db)
await runSeeder(userSeeder, env, db)

console.log(`seeding finished.`)
await db.$disconnect().then(() => {
  console.log('Disconnected from database.')
  process.exit(0)
}).catch((err) => {
  console.error('Error disconnecting from database:', err)
})
