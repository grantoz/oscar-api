import { PrismaClient } from '../../prisma/generated/client.ts'
import { Prisma } from '../../prisma/generated/client.ts'
import { PrismaPg } from "@prisma/adapter-pg";

const dbUrl: string = Deno.env.get('DB_URL') || ''

// TODO: observability, metrics (DONE: logging)
// https://www.prisma.io/docs/orm/prisma-client/observability-and-logging

if (!dbUrl) {
  console.error('DB_URL environment variable is not set')
  Deno.exit(1)
}


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

const adapter: PrismaPg = new PrismaPg({ connectionString: dbUrl! });

const db: PrismaClient = new PrismaClient({
  adapter,
  log,
})
// https://www.prisma.io/docs/orm/prisma-client/client-extensions
// https://www.prisma.io/docs/orm/prisma-client/queries/custom-models

export { db, Prisma }
export type { User, Country, Post } from '../../prisma/generated/client.ts'
