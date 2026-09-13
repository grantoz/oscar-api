# Project Oscar API

## Setup

- [Clone the related infrastructure repo](https://github.com/grantoz/oscar-infra) and follow the setup instructions
- [Ensure you have the latest Deno installed](https://docs.deno.com/runtime/getting_started/installation/)
- Clone this repo
- Run `deno task setup:all` - creates .env file with defaults, sets up and seeds database, generates prisma client
- Run `deno task dev` - start service

## Testing

You'll need to use `.env.test` for testing. The easiest way to do this is with a shell alias for `deno task`, e.g:

```sh
alias dtt='env $(grep -v "^#" .env.test | xargs) deno task'
```

First time, you'll need to set up the test env and DB: `dtt setup:all`

Ensure there's an instance of the app server running in test mode: `dtt dev`

You can then run the tests: `dtt test`

## Inspiration

- [Why](./doc/why.md)

## Features

**DONE:**

- JWT issuance and middleware
- JWT refresh token and flow
- Deno KV session validation and easy invalidation
- Pagination (10, 25, 50, 100)
- DB setup and migration CLI tools
- Easy project setup
- Last-Modified header for individual and collection entity endpoints
- Emit etag for API resources
- Only emit etag for GET-type routes

**TODO:**
-
- Some more meaningful entities
- JWT invalidation via CLI
- API tests (in progress...)
- Hono CORS middleware
- Hono / Zod OpenApi generation
- View models (AKA transformers / presenters) - perhaps class based with
  declarative properties e.g. `publicFields`, map transform field:function
- ACL system for API components
- Queue for async I/O (probably using Deno KV Queue)
- OAuth2.0
- CI testing
- Postmark integration
- Maybe: Varnish in front of all GET by default, with per-calling=user and per-resource
  tagging to allow for invalidation
- Invalidation strategies for all listable entities to account for pagination
  - both singular e.g. /user/*
  - and composite e.g. /user/:id/post/*
