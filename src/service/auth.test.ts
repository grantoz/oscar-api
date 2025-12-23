import "@std/dotenv/load";
import { superEmail, superPass } from '../../prisma/seed/user.ts'
import { authoriseLogin } from './auth.ts'
import { assert, assertEquals, assertExists, assertRejects } from '@std/assert'
import { db } from '@mod/db'


Deno.test("authoriseLogin fails with bad email", function() {
  assertRejects(
    () => authoriseLogin('x@x.x', superPass),
    Error,            // Expected error class (optional, but good practice)
    // "User not found"  // Expected error message or part of the message (optional)
  );
})

Deno.test("authoriseLogin fails with bad password", function() {
  assertRejects(
    () => authoriseLogin(superEmail, 'x'),
    Error,            // Expected error class (optional, but good practice)
    // "User not found"  // Expected error message or part of the message (optional)
  );
  // console.log('foo result', foo)
  // assertEquals(foo, true)
})

Deno.test("authoriseLogin succeeds with valid email and password and returns User instance", async function() {
  const user = await authoriseLogin(superEmail, superPass)
  // Check that the object exists
  assertExists(user);

  // Check specific values
  assertEquals(user.email, superEmail);

  const isUser =
    user &&
    typeof user.id === "string" &&
    typeof user.email === "string"

  assert(isUser, "Result should conform to User model shape");

  // await db.$disconnect()
})