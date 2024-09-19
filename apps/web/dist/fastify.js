import Fastify from 'fastify';
// import { Server, IncomingMessage, ServerResponse } from 'http'
import { PrismaClient } from '@grantoz/db';
const server = Fastify({});
const prisma = new PrismaClient();
const opts = {
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
    return { pong: 'it worked!' };
});
server.get('/hello/:user', async (req, out) => {
    out.type('application/json').code(200);
    return { pong: `${req.params.user}!` };
});
const start = async () => {
    BigInt.prototype.toJSON = function () {
        return this.toString();
    };
    console.log('can I get an env var?', process.env.DEPLOYMENT);
    try {
        await server.listen({ port: 3000 }); // host?
        const address = server.server.address();
        const port = typeof address === 'string' ? address : address?.port;
        console.log('Server listening at', port);
    }
    catch (err) {
        server.log.error(err);
        await prisma.$disconnect();
        process.exit(1);
    }
};
process.on('unhandledRejection', async (err) => {
    console.log(err);
    await prisma.$disconnect();
    process.exit(1);
});
start().then(async () => {
    await prisma.$disconnect();
});
