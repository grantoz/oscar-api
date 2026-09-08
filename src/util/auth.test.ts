import '@std/dotenv/load'
import { authoriseLogin } from './auth.ts'
import { assert, assertEquals, assertExists, assertRejects } from '@std/assert'
import { testUsers } from './test.ts'

const { superUser } = testUsers

Deno.test('authoriseLogin fails with bad email', function () {
  assertRejects(
    async () => await authoriseLogin('x@x.x', superUser.pass),
    Error, // Expected error class (optional, but good practice)
    // "User not found"  // Expected error message or part of the message (optional)
  )
})

Deno.test('authoriseLogin fails with bad password', function () {
  assertRejects(
    async () => await authoriseLogin(superUser.email, 'x'),
    Error, // Expected error class (optional, but good practice)
    // "User not found"  // Expected error message or part of the message (optional)
  )
  // console.log('foo result', foo)
  // assertEquals(foo, true)
})

Deno.test('authoriseLogin succeeds with valid email and password and returns User instance', async function () {
  const user = await authoriseLogin(superUser.email, superUser.pass)
  // Check that the object exists
  assertExists(user)

  // Check specific values
  assertEquals(user.email, superUser.email)

  const isUser = user &&
    typeof user.id === 'string' &&
    typeof user.email === 'string'

  assert(isUser, 'Result should conform to User model shape')

  // await db.$disconnect()
})
