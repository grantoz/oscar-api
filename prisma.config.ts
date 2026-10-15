// NB loaded by the Prisma CLI, which runs on Node. Prisma does not auto-load
// .env when a prisma.config.ts is present, so load it here.
import 'dotenv/config'
import process from 'node:process'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node --import tsx prisma/seed/index.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
})
