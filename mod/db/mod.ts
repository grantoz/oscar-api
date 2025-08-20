// @ts-types="../../node_modules/generated/index.d.ts"
import { PrismaClient, Prisma } from 'generated/index.js'

// import { ulid } from "@std/ulid";
// https://docs.deno.com/examples/ulid/

const dbUrl = Deno.env.get('DB_URL')
console.log('databaseUrl', dbUrl)

// TODO: observability, metrics, logging
// https://www.prisma.io/docs/orm/prisma-client/observability-and-logging

const db = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
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