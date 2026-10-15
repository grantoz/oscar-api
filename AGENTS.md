# AGENTS.md

## Migration: Deno -> Node (in progress)

This project is being migrated off Deno because Deno is being abandoned. The
target runtime is Node. The migration is incremental; do not assume the whole
app runs on Node yet.

Progress so far:

- **Deno KV -> Redis (node-redis)**: `src/util/kv.ts` no longer uses
  `Deno.openKv`. It now wraps the `redis` npm client and keeps the small Deno KV
  surface used by callers (`kv.get`/`kv.set`/`kv.delete`/`kv.close` over array
  keys) so no caller changes were needed. See "Environment / config" for the
  Redis connection settings.

Remaining Deno-specific pieces (not yet migrated): the `deno` tasks/imports in
`deno.jsonc`, `Deno.serve` / `Deno.env` / `Deno.addSignalListener` in
`src/main.ts`, `deno test` integration tests, JSR imports (`@std/*`,
`@felix/argon2`), and the Deno-flavoured Prisma client (`runtime = "deno"`).

## Stack

- **Deno** runtime (not Node). Run everything via `deno task ...`, not npm.
  `package.json` pins the npm deps resolved through `nodeModulesDir: auto`
  (Prisma, `redis`, `ky`, ...).
- **Hono** web framework; **Prisma** ORM (Postgres); **Zod** validation;
  **Redis** (node-redis) for sessions/refresh tokens and last-modified tracking.
- Prisma client is generated ESM-first with `runtime = "deno"`,
  `engineType = "client"` (no Rust engine), output to `prisma/generated/`. It is
  consumed via the `@mod/db` workspace package (`mod/db/mod.ts`), which exports
  `db`, `Prisma`, `getDB`.

## Import aliases (defined in `deno.jsonc` `imports`)

- `@util` -> `./src/util/mod.ts`
- `@/` -> `./src/`
- `@mod/db` -> workspace package `mod/db`

## Commands

- `deno task setup:all` — full first-time setup: writes `.env` (from
  `env/.env.dev`, with a random `JWT_SECRET`), generates the Prisma client,
  creates + migrates + seeds the DB.
- `deno task dev` — run server on `PORT` (default 8000). `deno task dev:otel`
  enables OpenTelemetry.
- `deno task db:generate` — regenerate the Prisma client after editing
  `prisma/schema.prisma`. (Runs via Node/npm; the stray `node --help` in the
  task is a PATH check.)
- `deno task db:new` / `db:new:seed` — **destructive**: drop + recreate +
  migrate (and seed) the dev DB. Prompts for confirmation.
- `deno task db:migrate` — `prisma migrate dev` against `.env`.

## Environment / config

- `main.ts` must `import '@std/dotenv/load'` first so the whole dependency graph
  sees env vars. Tasks also pass `--env-file`.
- `DATABASE_URL` is required (Prisma exits if unset). A Redis client is
  connected at import time in `src/util/kv.ts`, using `REDIS_URL` (default
  `redis://localhost:6379`) and an optional `REDIS_KEY_PREFIX` (default
  `oscar`) for namespacing keys.
- `deno.jsonc` `unstable: ["otel"]` — required at runtime.

## Testing (integration tests — not self-contained)

There are no test-specific tasks. Derive the underlying commands from the
`deno.jsonc` tasks and point them at the test env with `--env-file=.env.test`
(e.g. `deno task dev` becomes
`deno run -A --env-file=.env.test src/main.ts`).

Tests are **HTTP integration tests** that hit a running server on `PORT=8001`
via `ky`. They will fail unless:

1. The test DB exists and is seeded (derived from `db:new:seed`):
   `deno run -A --env-file=.env.test cli/alter_db.js --drop --create && deno run -A --env-file=.env.test npm:prisma migrate dev && deno run -A --env-file=.env.test ./prisma/seed/index.ts`.
   This is **destructive** (drops + recreates + migrates + seeds). Test DB name
   is the dev DB name + `_test` suffix.
2. A Redis server is running (see `REDIS_URL`, default `redis://localhost:6379`).
   Test and dev keys are separated by the port embedded in each key.
3. The server is running against `.env.test` in a separate terminal:
   `deno run -A --env-file=.env.test src/main.ts` (add `--watch` to reload on
   change, as `dev` does).

Then run the suite (this is what `deno task test` runs):

```
deno test -A --env-file=.env.test --trace-leaks src/
```

`--env-file=.env.test` is applied before modules load, and `.env` loaded by
`@std/dotenv/load` does not override already-set vars, so the test values win.

Seeded test credentials (`prisma/seed/user.ts`): `super@grantoz.io` /
`superPass2025$`, `admin@grantoz.io` / `adminPass2025$`, etc. Test helpers live
in `src/util/test.ts` (`asSuper`, `asAdmin`, `testUsers`). Pure unit tests (e.g.
`src/util/lastModified.test.ts`) don't need the server; `src/util/kv.test.ts`
exercises the Redis-backed KV adapter directly and so needs a running Redis, but
not the server or DB.

## Style

- `deno fmt` config: no semicolons, single quotes, 2-space indent.
- `deno lint` excludes `prisma/generated/**` and `prisma/zod/**`.
- No dedicated typecheck task; Deno type-checks during `deno test` / `deno run`.

## Notes

- Seeding randomizes the four seeded-user passwords when `APP_ENV` is
  `prod`/`uat`/`sandbox` (prints the super password once).
