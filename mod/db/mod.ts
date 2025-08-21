// @ts-types="../../node_modules/generated/index.d.ts"
import { PrismaClient, Prisma } from 'generated/index.js'

// import { ulid } from "@std/ulid";
// https://docs.deno.com/examples/ulid/

const dbUrl = Deno.env.get('DB_URL')

// TODO: observability, metrics, logging
// https://www.prisma.io/docs/orm/prisma-client/observability-and-logging

const log: Prisma.LogDefinition[] = [
  { emit: 'stdout', level: 'warn' },
  { emit: 'stdout', level: 'error' },
];
if (Deno.env.get('LOG_DB_QUERY') === 'true') {
  log.push({ emit: 'stdout', level: 'query' });
}
if (Deno.env.get('LOG_DB_INFO') === 'true') {
  log.push({ emit: 'stdout', level: 'info' });
}

const db = new PrismaClient({
  log,
  datasources: {
    db: {
      url: dbUrl,
    },
  },
})
// https://www.prisma.io/docs/orm/prisma-client/client-extensions
// https://www.prisma.io/docs/orm/prisma-client/queries/custom-models

export { db, Prisma }
export type { User, Country, Post } from 'generated/index.js'