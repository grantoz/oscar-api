'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Server } from "@hapi/hapi";
import { PrismaClient } from '@grantoz/db';
const prisma = new PrismaClient();
const init = () => __awaiter(void 0, void 0, void 0, function* () {
    BigInt.prototype.toJSON = function () {
        return this.toString();
    };
    const server = new Server({
        port: 3000,
        host: 'localhost'
    });
    // const server = Hapi.server({
    //     port: 3000,
    //     host: 'localhost'
    // });
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
        handler: (req, _h) => __awaiter(void 0, void 0, void 0, function* () {
            const user = yield prisma.user.findMany();
            console.dir(user);
            return JSON.stringify(user);
        })
    });
    server.route({
        method: 'GET',
        path: '/user/some',
        handler: (req, _h) => __awaiter(void 0, void 0, void 0, function* () {
            // cursor based pagination https://www.prisma.io/docs/orm/prisma-client/queries/pagination
            const user = yield prisma.user.findMany({
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
        })
    });
    server.route({
        method: 'GET',
        path: '/user/{id}',
        handler: (req, _h) => __awaiter(void 0, void 0, void 0, function* () {
            const user = yield prisma.user.findFirst({
                where: { id: req.params.id }
            });
            console.dir(user);
            return JSON.stringify(user);
        })
    });
    yield server.start();
    console.log('Server running on %s', server.info.uri);
});
process.on('unhandledRejection', (err) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(err);
    yield prisma.$disconnect();
    process.exit(1);
}));
init().then(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}))
    .catch((e) => __awaiter(void 0, void 0, void 0, function* () {
    console.error(e);
    yield prisma.$disconnect();
    process.exit(1);
}));
