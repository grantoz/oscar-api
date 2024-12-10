// @ts-types="../../node_modules/generated/index.d.ts"
import { PrismaClient } from '../../node_modules/generated/index.js'

const dbUrl = Deno.env.get('DB_URL');
console.log("databaseUrl", dbUrl);

export const db = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});
