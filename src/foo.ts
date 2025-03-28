// import { db } from "../db.ts"
// import * as foo from "@mod/db"
import 'jsr:@std/dotenv/load'
import { db } from '@mod/db'

export function add(a: number, b: number): number {
  return a + b
}

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  console.log('Add 4 + 13 =', add(4, 13))
}

const allUsers = await db.user.findMany({
  include: {
    posts: true,
  },
})
console.dir(allUsers, { depth: null })
