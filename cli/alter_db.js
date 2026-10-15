import { createInterface } from 'node:readline/promises'
import { db, match } from './db.js'

const args = process.argv.slice(2)
// const test = args.includes('--test')
const drop = args.includes('--drop')
const create = args.includes('--create')

if (!create && !drop) {
  console.error('No action specified, exiting...')
  process.exit()
}

const dbName = match?.groups?.db
const appEnv = process.env['APP_ENV'] || 'unknown'

if (!dbName) {
  console.error('No database name found in DATABASE_URL env var, exiting...')
  process.exit()
}

const rl = createInterface({ input: process.stdin, output: process.stdout })
const confirm = async (question) => {
  const answer = await rl.question(`${question} [y/N] `)
  return /^y(es)?$/i.test(answer.trim())
}

let proceed = false

async function createDb(db) {
  console.log(`Creating database '${dbName}'...`)

  const existingDBs = await db.query('select datname from pg_database')
  if (existingDBs.rows.find((db) => db.datname === dbName)) {
    console.log(`Database '${dbName}' already exists, exiting...`)
    process.exit(1)
  }

  if (!proceed) {
    proceed = await confirm(
      `This will create a new database '${dbName}' for environment '${appEnv}' - do you wish to proceed?`,
    )
    if (!proceed) {
      console.log('Exiting...')
      process.exit(1)
    }
  }

  const createSql = `CREATE DATABASE ${dbName}`
  try {
    await db.query(createSql)
    console.log(`Database '${dbName}' created.`)
  } catch (e) {
    console.error(
      `Error creating database '${dbName}': ${e.message} for statement: ${createSql}`,
    )
  }
}

async function dropDb(db) {
  console.log(`Dropping database '${dbName}'...`)
  if (!proceed) {
    proceed = await confirm(
      `This will drop the database '${dbName}' for environment '${appEnv}' - do you wish to proceed?`,
    )
    if (!proceed) {
      console.log('Exiting...')
      process.exit(1)
    }
  }

  const dropSql = `DROP DATABASE IF EXISTS ${dbName}`
  try {
    await db.query(dropSql)
    console.log(`Database '${dbName}' dropped.`)
  } catch (e) {
    console.error(
      `Error dropping database '${dbName}': ${e.message} for statement: ${dropSql}`,
    )
    process.exit(1)
  }
}

if (create && drop && !proceed) {
  proceed = await confirm(
    `This will drop the old database and create a new instance for '${dbName}' in environment '${appEnv}' - do you wish to proceed?`,
  )
}

if (!proceed) {
  console.log('Exiting...')
  process.exit(1)
}

if (drop) await dropDb(db)
if (create) await createDb(db)

rl.close()
await db.end()
process.exit()
