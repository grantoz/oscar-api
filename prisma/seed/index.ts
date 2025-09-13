import "@std/dotenv/load";
import { db } from '@mod/db'
import userSeed from './user.ts';
import countrySeed from './country.ts';

// TODO seeds for different environments
// TODO secret storage for super passwords for stage/uat/sandbox/prod

await userSeed()
await countrySeed()

console.log(`Seeding finished.`);
await db.$disconnect().then(() => {
  console.log('Disconnected from database.');
  Deno.exit(0);
}).catch((err) => {
  console.error('Error disconnecting from database:', err);
});