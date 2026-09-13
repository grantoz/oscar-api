import '@std/dotenv/load'
import { db } from '@mod/db'
import { hash, Variant, verify, Version } from '@felix/argon2'
import { assertEquals, assertExists } from '@std/assert'
import { hashPassword } from './user.ts'

Deno.test('generate salt and hashed password', async function () {
  const password = 'password123'
  const hash = await hashPassword(password)
  const isValid = await verify(hash, password)
  assertEquals(isValid, true)
})

Deno.test('find seeded users', async function () {
  const allUsers = await db.user.findMany({
    include: {
      posts: true,
    },
  })
  await db.$disconnect()
  // console.dir(allUsers, { depth: null })
  assertEquals(allUsers.length > 0, true)
})

export const testArgon2 = async () => {
  const encoder = new TextEncoder()
  const password = 'this-could_be/your-password'
  const secret = encoder.encode('my-super-secret')
  const data = {
    hashedAt: Date.now(),
    requestId: crypto.randomUUID(),
  }

  const hashed = await hash(password, {
    secret,
    variant: Variant.Argon2id,
    version: Version.V13,
    memoryCost: 8192,
    timeCost: 10,
    lanes: 4,
    hashLength: 32,
    data,
  })

  return await verify(hashed, password, secret, data)
}

Deno.test('test argon2 hash', async function () {
  const result = await testArgon2()
  assertEquals(result, true)
})
