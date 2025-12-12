//import "@std/dotenv/load";
// import "jsr:@std/dotenv";
import { defineConfig, env } from "prisma/config";

// TODO why prisma env() doesn't work here, nor Deno env
const DB_URL = 'postgresql://user:pass@localhost:5432/oscar?schema=public'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'deno run prisma/seed.ts',
  },
  datasource: {
    url: DB_URL
    // url: env('DB_URL')
    // url: Deno.env.get('DB_URL') ?? ''
  }
});
