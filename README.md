# Project Oscar API

**Oscar** - Just a name for this component and the corresponding Deno / Vite / React frontend, and an infrastructure layer (found in other related repos) - it doesn't mean anything.

But seriously, why are you even reading this? This is just a personal toy project, born of frustration with most of the tooling I've encountered in various workplaces.

Full stack dev is great, but honestly, what a ballache too. Stupidly arcane and complex setup for linters, typescript config (just try using esnext everywhere), monorepo tools, etc. etc. etc. If you're like me, you'll be struck by the irony that this great code technology has such over-complicated tooling and painful enough setup that people rarely change anything that they actually got working, meaning that projects often stay anchored in the past. And when you want to run a test, particularly to debug something you're building in the IDE, there's the inevitable 7 - 10 second delay while everything is checked and compiled. That's a terrible workflow IMHO.

That's what attracts me to Deno. No separate linter tool. No separate formatter tool. No separate compiler. Weird TS config issues just go away. No separate test suite (probably). It's all built in and it all just seems to works.

And now I can hit F5 in VS Code and it's running the tests before I can blink. Lovely. Which means I can now, finally, in principle debug problems at the speed of thought without that super-annoying delay while tsc and all the other build tooling chugs.

So this project is just about building, initially, a CRUD API base using the lightest-weight possible tooling, with the possible exception of Prisma, which I'm using just because I like it.

TODO:

- Queues using Deno
- Deno KV auth layer
- OAuth2.0

TODO NEXT GRANT:

move basic routes - / (health), home, login, forgot password to src/api/home
user query routes to api/user
hono cors
