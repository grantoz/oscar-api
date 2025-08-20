import { db } from '@mod/db'
import "jsr:@std/dotenv/load";
import userSeed from './user.ts';
import countrySeed from './country.ts';

// TODO seeds for different environments
// TODO secret storage for super passwords for stage/uat/sandbox/prod

userSeed()
countrySeed()

console.log(`Seeding finished.`);
await db.$disconnect();