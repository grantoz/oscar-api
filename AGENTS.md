# AGENTS.md

## Migration: Deno -> Node (core migration complete)

This project was migrated off Deno to Node. The app, tests and CLI now run on
**Node 26** with **npm** and TypeScript executed via **tsx** (type-stripping
loader; `tsconfig.json` `paths` resolve the `@util`/`@mod/db`/... aliases).

What changed:

- **Runtime**: `Deno.serve` -> `@hono/node-server`; `Deno.env` -> `process.env`;
  `Deno.addSignalListener` -> `process.on('SIGINT'|'SIGTERM')`; `Deno.exit` ->
  `process.exit`; `Deno.args` -> `process.argv`; `Deno.*File(Read|Write)` ->
  `node:fs`.
- **Deno KV -> Redis (node-redis)**: `src/util/kv.ts` wraps the `redis` npm
  client behind a small Deno-KV-shaped API (`kv.get`/`set`/`delete`/`close` over
  array keys).
- **Deps**: JSR/Deno imports replaced with npm equivalents — `@std/assert` ->
  `@/util/assert.ts` (thin `node:assert` shim), `@std/csv` -> `csv-parse`,
  `@std/encoding/base64` -> `Buffer`, `@felix/argon2` -> `@node-rs/argon2`,
  `@faker` -> `@faker-js/faker`, `@db/postgres` -> `pg`, `@hono/*` -> `hono/*`,
  `@zod` -> `zod`, `@std/dotenv/load` -> `dotenv/config`.
- **Prisma**: generated client `runtime = "nodejs"` (was `"deno"`).
- **Tests**: `Deno.test` -> `node:test`.
- `deno.jsonc`, `deno.lock` and the `mod/db` Deno workspace file were removed.

Known follow-ups (not yet done):

- **Linting/formatting**: `oxlint` (`.oxlintrc.json`) and `oxfmt`
  (`.oxfmtrc.json`) are wired up — `npm run lint` / `npm run lint:fix` and
  `npm run format` / `npm run format:check`. CI runs oxlint via
  `oxc-project/oxlint-action`. Style: no semicolons, single quotes, 2-space
  indent.

## Stack

- **Node 26** runtime. Run everything via `npm run ...`. TypeScript is executed
  directly by `tsx` (`node --import tsx ...`); there is no build step.
- **Hono** web framework (`@hono/node-server` for the HTTP server); **Prisma**
  ORM (Postgres) with `@prisma/adapter-pg`; **Zod** validation; **Redis**
  (node-redis) for sessions/refresh tokens and last-modified tracking.
- Prisma client is generated ESM-first with `runtime = "nodejs"`,
  `engineType = "client"` (no Rust engine), output to `prisma/generated/`. It is
  imported directly (`mod/db/mod.ts`), which exports `db`, `Prisma`, `getDB`.

## Import aliases (defined in `tsconfig.json` `paths`)

- `@util` -> `./src/util/mod.ts`
- `@const` -> `./const/mod.ts`
- `@middleware` -> `./src/middleware/mod.ts`
- `@mod/db` -> `./mod/db/mod.ts`
- `@/` -> `./src/`

These resolve at runtime through `tsx` and for type-checking through `tsc`.

## Commands

- `npm run setup:all` — full first-time setup: writes `.env` (from
  `env/.env.dev`, with a random `JWT_SECRET`), generates the Prisma client,
  creates + migrates + seeds the DB.
- `npm run dev` — run server on `PORT` (default 8000), watch mode.
  `npm start` runs without watch.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run lint` — `oxlint` (config in `.oxlintrc.json`; `npm run lint:fix`
  applies fixes).
- `npm run format` — `oxfmt` (config in `.oxfmtrc.json`; `npm run format:check`
  checks without writing).
- `npm test` — run the `node:test` suite (see Testing).
- `npm run db:generate` — regenerate the Prisma client after editing
  `prisma/schema.prisma`.
- `npm run db:new` / `db:new:seed` — **destructive**: drop + recreate +
  migrate (and seed) the dev DB. Prompts for confirmation.
- `npm run db:migrate` — `prisma migrate dev` against `.env`.

## Environment / config

- Env is loaded with `node --env-file=.env` (npm scripts) plus `dotenv/config`
  imported for safety; `dotenv` does not override already-set vars, so
  `--env-file=.env.test` wins during tests.
- `DATABASE_URL` is required (Prisma exits if unset). A Redis client connects at
  import time in `src/util/kv.ts`, using `REDIS_URL` (default
  `redis://localhost:6379`) and an optional `REDIS_KEY_PREFIX` (default
  `oscar`) for namespacing keys.
- Redis is required at runtime (sessions/refresh tokens, last-modified).

## Testing (integration tests — not self-contained)

Tests use `node:test` and hit a running server on `PORT=8001` via `ky`. They
will fail unless:

1. The test DB exists and is seeded (see README). Test DB name is the dev DB
   name + `_test` suffix.
2. A Redis server is running (see `REDIS_URL`, default `redis://localhost:6379`).
   Test and dev keys are separated by the port embedded in each key.
3. The server is running against `.env.test`:
   `node --env-file=.env.test --import tsx src/main.ts`.

Then run the suite:

```
npm test
```

The script runs `node --env-file=.env.test --import tsx --test
--test-force-exit --test-concurrency=1 'src/**/*.test.ts'`. Notes:

- `--test-force-exit` is required because the Redis client/Prisma keep the event
  loop alive; without it the runner hangs after the tests pass.
- `--test-concurrency=1` runs test **files** serially. The tests are stateful
  (shared seeded users / logout invalidates sessions), so parallel files
  interfere.
- Test helpers live in `src/util/test.ts` (`asSuper`, `asAdmin`, `asStaff`,
  `asUser`, `testUsers`). Pure unit tests (e.g. `src/util/lastModified.test.ts`)
  don't need the server; `src/util/kv.test.ts` needs Redis only.

Seeded test credentials (`prisma/seed/user.ts`): `super@grantoz.io` /
`superPass2025$`, `admin@grantoz.io` / `adminPass2025$`, etc.

## Logging

- `src/util/logger.ts` exports `log`, a **pino** logger (also exported as
  `pinoLogger`). Use the standard pino call convention:
  `log.info({ field: value }, 'message')`, errors under the `err` key
  (`log.error({ err }, 'message')`), or `log.info('message')` for a bare message.
- Config: `LOG_LEVEL` (pino level), `LOG_FORMAT=JSON` for raw JSON output
  (anything else uses `pino-pretty`), `LOG_COLORS` for pretty colors.
- The actor id from `AsyncLocalStorage` (`actorContext.ts`) is attached to every
  record via a pino `mixin` (`actorMixin`); an explicit `actorId` field on the
  record wins.
- Sensitive fields (`password`/`*Confirm`, `token`, `authorization`) are redacted
  via pino `redact`, in addition to the `requestLog` payload redaction.
- `log.flush()` is called on shutdown in `src/main.ts`.

## Observability (OpenTelemetry)

- Enabled per-process with `USE_OTEL=true` (renamed from the Deno `OTEL_DENO`).
  `src/instrumentation.ts` starts the SDK and is imported **first** in
  `src/main.ts`; `shutdownOtel()` flushes it in `exit()`.
- Packages: `@opentelemetry/sdk-node` (SDK + exporters + env-based config),
  `@opentelemetry/auto-instrumentations-node` (traces/metrics for `pg`, redis,
  dns, net, pino, undici, ...), and `@hono/otel` (HTTP server spans/metrics).
- **Why `@hono/otel`**: `@hono/node-server` is ESM, so it imports `node:http`
  through the ESM loader and `@opentelemetry/instrumentation-http` cannot patch
  it. The Hono middleware (`httpInstrumentationMiddleware()`) provides the HTTP
  server spans (`http.route`, `http.response.status_code`) and the
  `http.server.request.duration` metric instead.
- Configuration is standard OTEL env: `OTEL_EXPORTER_OTLP_ENDPOINT` /
  `OTEL_EXPORTER_OTLP_*_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL`,
  `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES`, `OTEL_METRIC_EXPORT_INTERVAL`.
  For local output use `OTEL_TRACES_EXPORTER=console` /
  `OTEL_METRICS_EXPORTER=console` (or `none`).
- The custom DB metrics in `mod/db/crudMetrics.ts` are gated by `DB_METRICS`
  and are no-ops on the API layer unless the SDK is running (`USE_OTEL=true`).

## Style

- No semicolons, single quotes, 2-space indent (carried over from `deno fmt`).
- `oxlint` (`npm run lint`) and `oxfmt` (`npm run format`) are wired up.

## Notes

- Seeding randomizes the four seeded-user passwords when `APP_ENV` is
  `prod`/`uat`/`sandbox` (prints the super password once).
- `BigInt.prototype.toJSON` is patched in `src/main.ts` so Prisma BigInt fields
  serialize as strings.
