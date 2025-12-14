// NB can't use deno module @jsr/dotenv here, so use:
import process from "node:process"
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'deno run prisma/seed.ts',
  },
  datasource: {
    url: process.env.DB_URL ?? ''
  }
});
