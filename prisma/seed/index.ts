import "@std/dotenv/load";
import { getDB } from '@mod/db'
import userSeed from './user.ts';
import countrySeed from './country.ts';

Deno.env.set('LOG_DB_QUERY', 'false')
Deno.env.set('LOG_DB_INFO', 'false')
const db = getDB()
console.log(`Seeding finished.`);
await countrySeed(db)
await userSeed(db)

console.log(`Seeding finished.`);
await db.$disconnect().then(() => {
  console.log('Disconnected from database.');
  Deno.exit(0);
}).catch((err) => {
  console.error('Error disconnecting from database:', err);
});