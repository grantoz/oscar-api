import { db, match } from './db.js'

// const test = Deno.args.includes('--test')
const drop = Deno.args.includes('--drop')
const create = Deno.args.includes('--create')

if (!create && !drop) {
  console.error('No action specified, exiting...')
  Deno.exit()
}

const dbName = match?.groups?.db
const appEnv = Deno.env.get('APP_ENV') || 'unknown'

if (!dbName) {
  console.error('No database name found in DATABASE_URL env var, exiting...')
  Deno.exit()
}

let proceed = false

async function createDb(db) {
  console.log(`Creating database '${dbName}'...`)

  const existingDBs = await db.queryObject('select datname from pg_database')
  if (existingDBs.rows.find((db) => db.datname === dbName)) {
    console.log(`Database '${dbName}' already exists, exiting...`)
    Deno.exit(1)
  }

  if (!proceed) {
    proceed = confirm(
      `This will create a new database '${dbName}' for environment '${appEnv}' - do you wish to proceed?`,
    )
    if (!proceed) {
      console.log('Exiting...')
      Deno.exit(1)
    }
  }

  const createSql = `CREATE DATABASE ${dbName}`
  try {
    await db.queryArray(createSql)
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
    proceed = confirm(
      `This will drop the database '${dbName}' for environment '${appEnv}' - do you wish to proceed?`,
    )
    if (!proceed) {
      console.log('Exiting...')
      Deno.exit(1)
    }
  }

  const dropSql = `DROP DATABASE IF EXISTS ${dbName}`
  try {
    await db.queryArray(dropSql)
    console.log(`Database '${dbName}' dropped.`)
  } catch (e) {
    console.error(
      `Error dropping database '${dbName}': ${e.message} for statement: ${dropSql}`,
    )
    Deno.exit(1)
  }
}

if (create && drop && !proceed) {
  proceed = confirm(
    `This will drop the old database and create a new instance for '${dbName}' in environment '${appEnv}' - do you wish to proceed?`,
  )
}

if (!proceed) {
  console.log('Exiting...')
  Deno.exit(1)
}

if (drop) await dropDb(db)
if (create) await createDb(db)

await db.end()
Deno.exit()
