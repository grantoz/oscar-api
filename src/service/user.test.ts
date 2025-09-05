import { db, User } from '@mod/db'
import { verify } from "@felix/argon2";
import { assertEquals, assertExists } from '@std/assert'
import { genSalt, hashPassword } from './user.ts';


Deno.test("generates salt and hashes password", async function() {
  const salt = genSalt()
  assertExists(salt)
  const password = 'password123'
  const hash = await hashPassword(password, salt)
  const isValid = await verify(hash, password)
  assertEquals(isValid, true)
})

Deno.test("Finds seeded users", async function() {
  const allUsers = await db.user.findMany({
    include: {
      posts: true,
    },
  })
  console.dir(allUsers, { depth: null })
  assertEquals(allUsers.length > 0, true)
})