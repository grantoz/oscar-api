# AGENTS.md

## Stack

- **Deno** runtime (not Node). Run everything via `deno task ...`, not npm. `package.json` exists only to pin Prisma deps (`nodeModulesDir: auto`).
- **Hono** web framework; **Prisma** ORM (Postgres); **Zod** validation; **Deno KV** for sessions/refresh tokens.
- Prisma client is generated ESM-first with `runtime = "deno"`, `engineType = "client"` (no Rust engine), output to `prisma/generated/`. It is consumed via the `@mod/db` workspace package (`mod/db/mod.ts`), which exports `db`, `Prisma`, `getDB`.

## Import aliases (defined in `deno.json` `imports`)

- `@util` -> `./src/util/mod.ts`
- `@/` -> `./src/`
- `@mod/db` -> workspace package `mod/db`

## Commands

- `deno task setup:all` — full first-time setup: writes `.env` (from `env/.env.dev`, with a random `JWT_SECRET`), generates the Prisma client, creates + migrates + seeds the DB.
- `deno task dev` — run server on `PORT` (default 8000). `deno task dev:otel` enables OpenTelemetry.
- `deno task db:generate` — regenerate the Prisma client after editing `prisma/schema.prisma`. (Runs via Node/npm; the stray `node --help` in the task is a PATH check.)
- `deno task db:new` / `db:new:seed` — **destructive**: drop + recreate + migrate (and seed) the dev DB. Prompts for confirmation.
- `deno task db:migrate` — `prisma migrate dev` against `.env`.

## Environment / config

- `main.ts` must `import '@std/dotenv/load'` first so the whole dependency graph sees env vars. Tasks also pass `--env-file`.
- `DB_URL` is required (Prisma exits if unset). Deno KV (`Deno.openKv`) is opened at import time in `src/util/kv.ts`.
- `deno.json` `unstable: ["kv", "otel"]` — these flags are required at runtime.

## Testing (integration tests — not self-contained)

`deno task test` = `deno test -A --env-file=.env.test --trace-leaks src/`. Tests are **HTTP integration tests** that hit a running server on `PORT=8001` via `ky`. They will fail unless:

1. The test DB exists and is seeded: `deno task test:setup:all` (or `test:db:new:seed`). Test DB name is the dev DB name + `_test` suffix.
2. The server is running against `.env.test`: `deno task test:dev` (separate terminal).

Seeded test credentials (`prisma/seed/user.ts`): `super@grantoz.io` / `superPass2025$`, `admin@grantoz.io` / `adminPass2025$`, etc. Test helpers live in `src/util/test.ts` (`asSuper`, `asAdmin`, `testUsers`). Pure unit tests (e.g. `src/util/lastModified.test.ts`) don't need the server.

## Style

- `deno fmt` config: no semicolons, single quotes, 2-space indent.
- `deno lint` excludes `prisma/generated/**` and `prisma/zod/**`.
- No dedicated typecheck task; Deno type-checks during `deno test` / `deno run`.

## Notes

- `cli/patchPrismaZodGeneratorOutput.ts` and the `rm -rf prisma/zod` in `db:generate` are stale — the `prisma-zod-generator` was removed (commit `a046301`). There is no `prisma/zod` directory.
- Seeding randomizes the four seeded-user passwords when `APP_ENV` is `prod`/`uat`/`sandbox` (prints the super password once).
