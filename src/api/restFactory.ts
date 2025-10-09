import '@std/dotenv/load'
import { Context, Hono } from '@hono'
import { db, Prisma } from '@mod/db'
import { type PrismaClient } from '@mod/db';
import { log, meta, paged, pageOptions } from '../util/mod.ts'
import { zValidator } from '@hono/zod-validator'
import { z } from '@zod'
import { userView } from '../view/user.ts'
import { PrismaAction } from '../../prisma/generated/internal/prismaNamespace.ts'

// TODO add email verification, phone verification etc
// TODO add role based access control, admin user etc


// Define a generic type for the model delegate
type ModelDelegate<T extends Prisma.ModelName> = PrismaClient[Uncapitalize<T> extends keyof PrismaClient ? Uncapitalize<T> : never];

// Define the generic findUnique function
async function genericFindUnique<T extends Prisma.ModelName>(
  modelName: T,
  where: Prisma.Args<ModelDelegate<T>, 'findUnique'>['where']
): Promise<Prisma.Result<ModelDelegate<T>, PrismaAction, 'findUnique'> | null> {
  const delegate = db[modelName.toLowerCase() as keyof PrismaClient];
  // deno-lint-ignore no-explicit-any
  return await (delegate as any).findUnique({ where });
}

async function genericFindMany<T extends Prisma.ModelName>(
  modelName: T,
  where: Prisma.Args<ModelDelegate<T>, 'findMany'>['where']
): Promise<Prisma.Result<ModelDelegate<T>, PrismaAction, 'findMany'> | null> {
  const delegate = db[modelName.toLowerCase() as keyof PrismaClient];
  // deno-lint-ignore no-explicit-any
  return await (delegate as any).findMany({ where });
}


// const restFactory = (modelName: Prisma.ModelName) => {
//   const app = new Hono()
//   .get('/', async (c: Context) => {
//     const options = pageOptions(c.req.query() as paged)
//     const users = await genericFindMany(modelName, options)
//     // TODO cache headers, etag etc
//     return c.json({ data: users.map(userView), meta: meta(users) })
//   })

//   .get('/:id', zValidator('param', z.object({ id: z.uuidv7() })), async (c: Context) => {
//     const { id } = c.req.valid('param' as never);
//     const user = await db.user.findUnique({
//       where: {
//         id,
//       },
//     })
//     if (!user) {
//       return c.json({ error: 'User not found' }, 404)
//     }
//     return c.json({ data: userView(user) })
//   })

//   return app
// }





// Example usage:
async function main() {
  // Find a user by ID
  const user = await genericFindUnique('User', { id: 1 });
  if (user) {
    console.log('Found user:', user);
  } else {
    console.log('User not found.');
  }
  const users = await genericFindMany('User', { id: 1 });
  if (users) {
    console.log('Found user:', users);
  } else {
    console.log('User not found.');
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await db.$disconnect();
  });

