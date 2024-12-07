// note, always load dotenv first so that other imports in the dependency graph can use it
import "@std/dotenv/load";
import postgres from 'https://deno.land/x/postgresjs/mod.js'

// https://deno.land/x/postgresjs@v3.4.5

const sql = postgres(Deno.env.get("DB_URL")) // will use psql environment variables

export default sql
