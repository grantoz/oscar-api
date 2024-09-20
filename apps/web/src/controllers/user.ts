import { FastifyRequest, FastifyReply, HTTPMethods, RouteGenericInterface } from 'fastify';
import { prisma } from '@grantoz/db'; 

interface IParams {
  id: number;
}

interface RouteGeneric extends RouteGenericInterface {
  Params: IParams;
}

export const userRoutes = [{
    method: 'GET' as HTTPMethods,
    url: '/user/all',
    handler: async(_req, out) => {
      out.type('application/json').code(200);
      const users = await prisma.user.findMany();
      // console.dir(users);
      return users;
    }
  },
  {
    method: 'GET' as HTTPMethods,
    url: '/user/:id',
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },  
        required: ['id']
      }
    },
    handler: async (req: FastifyRequest<RouteGeneric>, reply: FastifyReply) => {
      reply.type('application/json').code(200);
      const user = await prisma.user.findUnique({
        where: {
          id: req.params.id
        }
      });
      // console.dir(user);
      return user;
    }
  },
  {
    method: 'GET' as HTTPMethods,
    url: '/user/some',
    handler: async(_req, out) => {
      out.type('application/json').code(200);
      const users = await prisma.user.findMany({
        take: 4,
        cursor: {
          id: 2,
        },
        orderBy: {
          id: 'asc',
        }
      });
      // console.dir(users);
      return users;
    }
  }
];
