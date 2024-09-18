'use strict';
import { Server } from "@hapi/hapi";
import { PrismaClient } from '@grantoz/db';
const prisma = new PrismaClient();
const init = async () => {
    BigInt.prototype.toJSON = function () {
        return this.toString();
    };
    console.log('can I get an env var?', process.env.DEPLOYMENT);
    const server = new Server({
        port: 3000,
        host: 'localhost'
    });
    server.route({
        method: 'GET',
        path: '/',
        handler: (_req, _h) => {
            return 'Hello World!';
        }
    });
    server.route({
        method: 'GET',
        path: '/hello/{user}',
        handler: (req, _h) => {
            return `Hello ${req.params.user}!`;
        }
    });
    server.route({
        method: 'GET',
        path: '/user/all',
        handler: async (req, _h) => {
            const user = await prisma.user.findMany();
            console.dir(user);
            return JSON.stringify(user);
        }
    });
    server.route({
        method: 'GET',
        path: '/user/some',
        handler: async (req, _h) => {
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
        }
    });
    server.route({
        method: 'GET',
        path: '/user/{id}',
        handler: async (req, _h) => {
            const user = await prisma.user.findFirst({
                where: { id: req.params.id }
            });
            console.dir(user);
            return JSON.stringify(user);
        }
    });
    await server.start();
    console.log('Server running on %s', server.info.uri);
};
process.on('unhandledRejection', async (err) => {
    console.log(err);
    await prisma.$disconnect();
    process.exit(1);
});
init().then(async () => {
    await prisma.$disconnect();
})
    .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
