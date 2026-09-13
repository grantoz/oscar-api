import '@std/dotenv/load'
import {
  authoriseLogin,
  createAndStoreLoginTokens,
  deleteLoginTokens,
} from './auth.ts'
import { assert, assertEquals, assertExists, assertRejects } from '@std/assert'
import { kv } from './kv.ts'
import { testUsers } from './test.ts'

const { superUser } = testUsers
const port = parseInt(Deno.env.get('PORT') || '8000')

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

Deno.test('createAndStoreLoginTokens creates login and refresh tokens in kv', async function () {
  const user = await authoriseLogin(superUser.email, superUser.pass)

  const tokens = await createAndStoreLoginTokens(user)

  assert(typeof tokens.token === 'string' && tokens.token.length > 0)
  assert(typeof tokens.refresh === 'string' && tokens.refresh.length > 0)

  const [login, refresh] = await Promise.all([
    kv.get(['login', port, user.id]),
    kv.get(['refresh', port, user.id]),
  ])

  assertExists(login.value)
  assertExists(refresh.value)
  assertEquals((login.value as { id: string }).id, user.id)
  assertEquals((refresh.value as { id: string }).id, user.id)
})

Deno.test('deleteLoginTokens removes login and refresh tokens from kv', async function () {
  const user = await authoriseLogin(superUser.email, superUser.pass)

  await createAndStoreLoginTokens(user)

  await deleteLoginTokens(user)

  const [login, refresh] = await Promise.all([
    kv.get(['login', port, user.id]),
    kv.get(['refresh', port, user.id]),
  ])

  assertEquals(login.value, null)
  assertEquals(refresh.value, null)
})
