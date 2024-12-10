// note, always load dotenv first so that other imports in the dependency graph can use it
import "jsr:@std/dotenv/load";
import { db } from "@mod/db"
import nhttp, { RequestEvent } from "@nhttp/nhttp"
import logger from "@nhttp/nhttp/logger"
import cors from "@nhttp/nhttp/cors";
import * as log from "@std/log";
// import { ulid } from "jsr:@std/ulid";
// https://docs.deno.com/examples/ulid/
// console.log(ulid());

log.setup({
  handlers: {
    default: new log.ConsoleHandler("DEBUG", {
      formatter: log.formatters.jsonFormatter,
      useColors: true,
    }),
  },
});

interface ReactAdminQuery {
  _page?: string
  _limit?: string
  _sort?: string
  _order?: "ASC" | "DESC"
}

interface queryOptions {
  orderBy?: { [key: string]: string }
  skip?: number
  take?: number
  where?: { [key: string]: string }
}

const parseSortOptions = (query: ReactAdminQuery): object => {
  const options: queryOptions = {};
  if (query._sort && query._order) {
    options.orderBy = {
      [query._sort]: query._order.toLowerCase(),
    }
  }
  if (query._page && query._limit) {
    options.skip = (parseInt(query._page) - 1) * parseInt(query._limit);
    options.take = parseInt(query._limit);
  }
  return options;
}

const app = nhttp()
app.use(logger())
app.use(cors())

app
  .get("/", () => {
    log.info("Welcome to the User API!")
    return "Welcome to the User API!"
  })
  .get("/user", async (rev: RequestEvent) => {
    // log.info(rev.query)
    const options = parseSortOptions(rev.query as ReactAdminQuery)
    const users = await db.user.findMany(options)
    rev.response.header().append("x-total-count", users.length.toString())
    rev.response.header().append("cache-control", "max-age=10")
    return {
      data: users,
      total: users.length,
    };
  })
  .get("/user/:id", async (rev: RequestEvent) => {
    const { id } = rev.params;
    const user = await db.user.findUnique({
      where: {
        id: Number(id),
      },
    });
    return user;
  })
  .post("/user", async (rev: RequestEvent) => {
    const { name, email } = rev.body;
    console.log(name, email);
    // return { name, email };
    const result = await db.user.create({
      data: {
        name,
        email,
      },
    });
    return result;
  })
  .delete("/user/:id", async (rev: RequestEvent) => {
    const { id } = rev.params;
    const user = await db.user.delete({
      where: {
        id: Number(id),
      },
    });
    return user;
  })
  // .options("*", (rev: RequestEvent) => {
  //   rev.response.header().append("Access-Control-Allow-Methods", "GET, POST, DELETE");
  //   rev.response.header().append('access-control-allow-origin', '*')
  //   return "OK"
  // })
  .onError((err, _rev) => {
    log.error(err)
    return "sorry, it's broken\n";
  });

// Other middleware here?

const start = async () => {
  // deno-lint-ignore no-explicit-any
  (BigInt.prototype as any).toJSON = function () { 
    return this.toString();
  }
  try {
    app.listen(3000);
  } catch (err) {
    console.error(err);
    // app.log.error(err);
    await db.$disconnect();
    Deno.exit(1);
  }
}

globalThis.addEventListener('unhandledRejection', async (err) => {
  console.log(err);
  await db.$disconnect();
  Deno.exit(1);
});

Deno.addSignalListener("SIGINT", async() => {
  console.log('Received SIGINT, stopping.');
  await db.$disconnect();
  Deno.exit();
});

start().then(async () => {
  await db.$disconnect();
});