// @ts-types="../../node_modules/generated/index.d.ts"
import { PrismaClient } from 'generated/index.js'
// @ts-types="../../node_modules/generated/deno/index.d.ts"
import { Prisma as Model } from 'generated/deno/edge.js'
import { ulid } from "@std/ulid";
// https://docs.deno.com/examples/ulid/

const dbUrl = Deno.env.get('DB_URL')
console.log('databaseUrl', dbUrl)

// TODO: observability, metrics, logging
// https://www.prisma.io/docs/orm/prisma-client/observability-and-logging

const db = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: dbUrl,
    },
  },
}).$extends({
  query: {
    $allModels: {
      $allOperations({ model: _model, operation, args, query }) {
        /* your custom logic for modifying all operations on all models here */
        // console.log('model', model)
        // console.log('operation', operation)
        // console.log('args', args)
        // console.log('query', query)
        if (operation === 'create' && !args.data?.extId) {
          // args.data.id = ulid();
          // console.log('args', args)
          args.data.extId = ulid()
          // console.log('ulid', ulid())
        }
        return query(args)
      },
    },
  },
})
// https://www.prisma.io/docs/orm/prisma-client/client-extensions


// model User
// operation create
// args { data: { name: "Abelisaurus", email: "Abelisaurus@grantoz.io" } }
// query [Function: query]

export { db, Model }
