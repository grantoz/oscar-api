// @ts-types="../../node_modules/generated/index.d.ts"
import { PrismaClient } from '../../node_modules/generated/index.js'
// import "jsr:@std/dotenv/load";
import { ulid } from "jsr:@std/ulid";
// https://docs.deno.com/examples/ulid/
console.log(ulid());

const databaseUrl = Deno.env.get('DB_URL')! // || config().DB_URL;

console.log("databaseUrl", databaseUrl);

export const db = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});
