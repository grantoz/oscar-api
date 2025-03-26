// note, always load dotenv first so that other imports in the dependency graph can use it
import "jsr:@std/dotenv/load";
import { Client } from "https://deno.land/x/postgres/mod.ts";

const dbUrl = Deno.env.get('DB_URL')
const match = dbUrl.match(/postgresql:\/\/(?<user>[^:]+):(?<pass>[^@]+)@(?<host>[^:]+):(?<port>\d+)\/(?<db>[^?]+)/)

const db = new Client({
  user: match.groups.user,
  password: match.groups.pass,
  database: 'postgres',
  hostname: match.groups.host,
  port: match.groups.port,
});

try {
  await db.connect();
  await db.queryObject('SELECT 1 as result');
} catch (e) {
  console.error(`Error connecting to postgres:`, e.message)
  Deno.exit()
}

export { db, match }
