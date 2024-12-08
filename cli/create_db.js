import db from './db.js'

const existingDBs = await db.queryObject('select datname from pg_database')
const dbName = Deno.env.get('PG_DB');

if(existingDBs.rows.find(db => db.datname === dbName)) {
  console.log(`Database '${dbName}' already exists, exiting...`)
  Deno.exit()
}

const shouldProceed = confirm(`This will create a new database '${dbName}' for environment '${Deno.env.get("APP_ENV")}' - do you wish to proceed?`)
if (!shouldProceed) {
  console.log("Exiting...")
  Deno.exit()
}

const createSql = `CREATE DATABASE ${ dbName }`
try {
  await db.queryArray(createSql)
  console.log(`Database '${dbName}' created successfully`)
} catch (e) {
  console.error(`Error creating database '${dbName}': ${e.message} for statement: ${createSql}`)
}

await db. end()
Deno.exit()
