// note, always load dotenv first so that other imports in the dependency graph can use it
import "./load_env.js";
import { Client } from "https://deno.land/x/postgres/mod.ts";
const { PG_USER, PG_PASS, PG_HOST, PG_PORT } = Deno.env.toObject();

const db = new Client({
  user: PG_USER,
  password: PG_PASS,
  database: 'postgres',
  hostname: PG_HOST,
  port: PG_PORT,
});

try {
  await db.connect();
  await db.queryArray('SELECT 1 as result');
} catch (e) {
  console.error(`Error connecting to postgres:`, e.message)
  Deno.exit()
}

export default db
