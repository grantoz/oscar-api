import { PrismaClient } from "@prisma/client/extension";
import { HTTPMethods } from 'fastify';

// nothing yet
export const userRoutes = (prisma: PrismaClient) => {
  return [{
    method: 'GET' as HTTPMethods,
    url: '/user/all',
    handler: async(_req, out) => {
      out.type('application/json').code(200);
      const user = await prisma.user.findMany();
      console.dir(user);
      return JSON.stringify(user);
    }
  },
  {
    // app.get<{ Params: { id: number } }>('/user/:id', async (req, out) => {
    method: 'GET' as HTTPMethods,
    url: '/user/:id',
    handler: async(req, out) => {
      out.type('application/json').code(200);
      const user = await prisma.user.findUnique({
        where: {
          id: req.params.id
        }
      });
      console.dir(user);
      return JSON.stringify(user);
    }
  },
  {
    method: 'GET' as HTTPMethods,
    url: '/user/some',
    handler: async(_req, out) => {
      out.type('application/json').code(200);
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
    }
  }];
};
