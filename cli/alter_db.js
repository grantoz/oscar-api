import { db, match } from './db.js'

const drop = Deno.args.includes('--drop')
const create = Deno.args.includes('--create')
let force = Deno.args.includes('--force')

if (!create && !drop) {
  console.error("No action specified, exiting...")
  Deno.exit()
}

const dbName = match?.groups?.db

if (create && drop && !force) {
  force = confirm(`This will drop the old database and create a new instance for '${dbName}' in environment '${Deno.env.get("APP_ENV")}' - do you wish to proceed?`)
}

if (!dbName) {
  console.error("No database name found in DB_URL env var, exiting...")
  Deno.exit()
}

async function createDb(db) {
  console.log(`Creating database '${dbName}'...`)

  const existingDBs = await db.queryObject('select datname from pg_database')
  if(existingDBs.rows.find(db => db.datname === dbName)) {
    console.log(`Database '${dbName}' already exists, exiting...`)
    Deno.exit()
  }

  if (!force) {
    const prompt = confirm(`This will create a new database '${dbName}' for environment '${Deno.env.get("APP_ENV")}' - do you wish to proceed?`)
    if (!prompt) {
      console.log("Exiting...")
      Deno.exit()
    }
  }

  const createSql = `CREATE DATABASE ${ dbName }`
  try {
    await db.queryArray(createSql)
    console.log(`Database '${dbName}' created.`)
  } catch (e) {
    console.error(`Error creating database '${dbName}': ${e.message} for statement: ${createSql}`)
  }
}


async function dropDb(db) {
  console.log(`Dropping database '${dbName}'...`)
  if (!force) {
    const prompt = confirm(`This will drop the database '${dbName}' for environment '${Deno.env.get("APP_ENV")}' - do you wish to proceed?`)
    if (!prompt) {
      console.log("Exiting...")
      Deno.exit()
    }
  }

  const dropSql = `DROP DATABASE ${ dbName }`
  try {
    await db.queryArray(dropSql)
    console.log(`Database '${dbName}' dropped.`)
  } catch (e) {
    console.error(`Error dropping database '${dbName}': ${e.message} for statement: ${dropSql}`)
  }
}

if (drop) { await dropDb(db) }
if (create) { await createDb(db) }

await db.end()
Deno.exit()
