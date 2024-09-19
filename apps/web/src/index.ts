import Fastify, { FastifyInstance, RouteShorthandOptions } from 'fastify'
// import { Server, IncomingMessage, ServerResponse } from 'http'
import { PrismaClient } from '@grantoz/db';

const server: FastifyInstance = Fastify({});
const prisma = new PrismaClient();

const opts: RouteShorthandOptions = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          pong: {
            type: 'string'
          }
        }
      }
    }
  }
};

server.get('/ping', opts, async (req, out) => {
  out.type('application/json').code(200);
  return { pong: 'it worked!' }
})

server.get<{ Params: { user: string } }>('/hello/:user', async (req, out) => {
    out.type('application/json').code(200);
    return { reply: `Hello ${req.params.user}!` };
});

server.get('/user/all', async (req, out) => {
  out.type('application/json').code(200);
  const user = await prisma.user.findMany();
  console.dir(user);
  return JSON.stringify(user);
});

server.get('/user/some', async (req, out) => {
  out.type('application/json').code(200);
    // cursor based pagination https://www.prisma.io/docs/orm/prisma-client/queries/pagination
    const user = await prisma.user.findMany({
      take: 4,
      cursor: {
        id: 2,
      },
      orderBy: {
        id: 'asc',
      }
    });
    console.dir(user);
    return JSON.stringify(user);
});

server.get<{ Params: { id: number } }>('/user/:id', async (req, out) => {
  out.type('application/json').code(200);
  const user = await prisma.user.findFirst({
    where: { id: req.params.id }
  })
  console.dir(user);
  return JSON.stringify(user);
});

const start = async () => {
  (BigInt.prototype as any).toJSON = function () { 
    return this.toString();
  }
  console.log('can I get an WOO WOO! env var?', process.env.DEPLOYMENT);
  try {
    await server.listen({ port: 3000 }); // host?

    const address = server.server.address();
    const port = typeof address === 'string' ? address : address?.port;
    console.log('Server listening at', port);

  } catch (err) {
    server.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

process.on('unhandledRejection', async (err) => {
  console.log(err);
  await prisma.$disconnect();
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, stopping.');
  await prisma.$disconnect();
  process.exit(0);
});

start().then(async () => {
  await prisma.$disconnect();
});