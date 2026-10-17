# Project Oscar API

> Migrated from Deno to Node. The app, tests and tooling now run on Node
> (targeting Node 26) with npm. See `AGENTS.md` for details.

## Setup

- [Clone the related infrastructure repo](https://github.com/grantoz/oscar-infra) and follow the setup instructions
- [Install Node 26](https://nodejs.org/) (nvm: `nvm install 26`)
- Clone this repo
- Run `npm install`
- Run `npm run setup:all` - creates `.env` file with defaults, sets up and seeds database, generates prisma client
- Run `npm run dev` - start service

## Testing

Tests are HTTP integration tests and need a Postgres database, a Redis server
and a running app server. They use `.env.test` (test DB name is the dev DB name
with a `_test` suffix, and `PORT=8001`).

First time, create the test env file and set up the test DB:

```sh
npm run setup:env -- --test   # writes .env.test (or copy env/.env.dev -> .env.test)
node --env-file=.env.test cli/alter_db.js --drop --create
node --env-file=.env.test --import tsx prisma/seed/index.ts
```

> `prisma migrate` reads `DATABASE_URL` from the environment; export the test
> values (e.g. `env $(grep -v '^#' .env.test | xargs) npx prisma migrate dev`)
> before applying migrations to the test DB.

Ensure there's an instance of the app server running against `.env.test`:

```sh
node --env-file=.env.test --import tsx src/main.ts
```

You can then run the tests:

```sh
npm test
```

## Logging

Structured logging is provided by `pino` (`src/util/logger.ts`, exported as
`log`). Use the standard pino call convention:

```ts
log.info({ field: value }, 'message')
log.error({ err }, 'message')
log.info('message')
```

Configuration (environment variables):

| Variable             | Default | Description                                                       |
| -------------------- | ------- | ----------------------------------------------------------------- |
| `LOG_LEVEL`          | `info`  | pino level (`trace`…`fatal`, `silent`).                           |
| `LOG_FORMAT`         | —       | Set to `JSON` for newline-delimited JSON output (deployed envs).  |
| `LOG_COLORS`         | —       | `true` colorizes the `pino-pretty` output used in local dev.      |

Outside `LOG_FORMAT=JSON`, output is pretty-printed for local development; with
`LOG_FORMAT=JSON` it is raw JSON on stdout. Sensitive fields (`password` /
`*Confirm`, `token`, `authorization`) are redacted, and the request-scoped
`actorId` (from the JWT `sub`) is attached to every record via
`AsyncLocalStorage`.

## Observability (OpenTelemetry)

Telemetry is enabled per-process with `USE_OTEL=true` (off by default in
`.env.test`). `src/instrumentation.ts` starts the OpenTelemetry SDK and is
imported **first** in `src/main.ts`, before the CJS dependencies it instruments.

- **Traces / metrics**: auto-instrumentation for `pg`, redis, dns, net, undici,
  etc. HTTP server spans and the `http.server.request.duration` metric come from
  the `@hono/otel` middleware rather than `instrumentation-http`, because
  `@hono/node-server` is ESM and `node:http` cannot be patched.
- **Logs**: pino records are forwarded to an OTLP logs collector through
  `pino-opentelemetry-transport` (a pino transport worker); normal stdout
  logging is preserved. `@opentelemetry/instrumentation-pino` is bundled with the
  auto-instrumentations but does **not** forward these logs, since it only
  patches the CJS `require('pino')` path, not this project's ESM import.
  Records are flushed on shutdown via `flushLogs()` in `src/main.ts`.
- **DB metrics**: the custom metrics in `mod/db/crudMetrics.ts` are gated by
  `DB_METRICS` and are no-ops unless the SDK is running.

Configuration uses standard OTEL environment variables, e.g.
`OTEL_EXPORTER_OTLP_ENDPOINT` (or the per-signal `OTEL_EXPORTER_OTLP_*_ENDPOINT`
variants), `OTEL_EXPORTER_OTLP_PROTOCOL`,
`OTEL_EXPORTER_OTLP_LOGS_PROTOCOL`, `OTEL_SERVICE_NAME`,
`OTEL_RESOURCE_ATTRIBUTES` and `OTEL_METRIC_EXPORT_INTERVAL`. For a local smoke
test without a collector, set `OTEL_TRACES_EXPORTER=console`,
`OTEL_METRICS_EXPORTER=console` and/or `OTEL_EXPORTER_OTLP_LOGS_PROTOCOL=console`.

> OTLP log records currently carry no trace correlation (`traceId`/`spanId`);
> log↔trace linking is a known follow-up.

## Inspiration

- [Why](./doc/why.md)

## Features

**DONE:**

- JWT issuance and middleware
- JWT refresh token and flow
- Redis (node-redis) session validation and easy invalidation
- Pagination (10, 25, 50, 100)
- DB setup and migration CLI tools
- Easy project setup
- Last-Modified header for individual and collection entity endpoints
- Emit etag for API resources
- Only emit etag for GET-type routes
- Per-env seeding (TODO improve)
- Hono / Zod OpenApi generation
- Structured logging (pino) and OpenTelemetry traces, metrics and logs

**TODO:**

- Some more meaningful entities
- JWT invalidation via CLI
- API tests (in progress...)
- Hono CORS middleware
- View models (AKA transformers / presenters) - perhaps class based with
  declarative properties e.g. `publicFields`, map transform field:function
- ACL system for API components
- Queue for async I/O (probably using Redis)
- OAuth2.0
- CI testing
- Postmark integration
- Maybe: Varnish in front of all GET by default, with per-calling=user and per-resource
  tagging to allow for invalidation
- Invalidation strategies for all listable entities to account for pagination
  - both singular e.g. /user/*
  - and composite e.g. /user/:id/post/*
