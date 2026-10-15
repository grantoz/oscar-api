import { test } from 'node:test'
import 'dotenv/config'
import { db } from '@mod/db'
import { Algorithm, hash, verify, Version } from '@node-rs/argon2'
import { assertEquals } from '@/util/assert.ts'
import { hashPassword } from './user.ts'

test('generate salt and hashed password', async function () {
  const password = 'password123'
  const hash = await hashPassword(password)
  const isValid = await verify(hash, password)
  assertEquals(isValid, true)
})

test('find seeded users', async function () {
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

  const hashed = await hash(password, {
    secret,
    algorithm: Algorithm.Argon2id,
    version: Version.V0x13,
    memoryCost: 8192,
    timeCost: 10,
    parallelism: 4,
    outputLen: 32,
  })

  return await verify(hashed, password, { secret })
}

test('test argon2 hash', async function () {
  const result = await testArgon2()
  assertEquals(result, true)
})
