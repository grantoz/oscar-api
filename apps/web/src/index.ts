import Fastify, { FastifyInstance, RouteShorthandOptions } from 'fastify'
import { prisma } from '@grantoz/db';
import { userRoutes } from './controllers/index.ts';

// do we want to grab config from a package?
// also think about how to handle redaction
const envToLogger = {
  dev: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'reqId,req.host,req.remoteAddress,req.remotePort',
      },
    },
  },
  prod: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
  test: false,
};

const app: FastifyInstance = Fastify({
  logger: envToLogger[process.env.DEPLOYMENT as 'dev' | 'prod' | 'test'] ?? true
});
// const prisma = new PrismaClient();

const pingOpts: RouteShorthandOptions = {
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

app.get('/ping', pingOpts, async (req, res) => {
  res.type('application/json').code(200);
  req.log.info('I have been pinged');
  return { pong: 'it worked!' }
})

// coerce querystring to array
// https://www.fastify.io/docs/latest/Validation-and-Serialization/#querystring
// '/?ids=1&ids=2&ids=3'
const idParamOpts: RouteShorthandOptions = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          default: []
        },
      },
    }
  }
}

app.get('/', idParamOpts, (request, reply) => {
  reply.send({ params: request.query }) // echo the querystring
})

app.get<{ Params: { user: string } }>('/hello/:user', async (req, out) => {
  out.type('application/json').code(200);
  return { reply: `Hello ${req.params.user}!` };
});

app.get<{ Params: { user: string, age: number } }>('/hello/:user/:age', async (req, out) => {
  out.type('application/json').code(200);
  return { reply: `Hello ${req.params.user}, is your age ${req.params.age}?` };
});

// TODO typing
userRoutes.forEach((route) => {
  app.route(route);
});

const start = async () => {
  (BigInt.prototype as any).toJSON = function () { 
    return this.toString();
  }
  // console.log('can I get an WOO WOO! env var?', process.env.DEPLOYMENT);
  try {
    await app.listen({ port: 3000 }); // host?

    const address = app.server.address();
    const port = typeof address === 'string' ? address : address?.port;
    console.log('Server listening at', port);

  } catch (err) {
    app.log.error(err);
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