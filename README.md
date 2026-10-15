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
