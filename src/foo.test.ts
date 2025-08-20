import { assertEquals } from '@std/assert'
import { add, testArgon2 } from './foo.ts'

Deno.test(function addTest() {
  const args: [number, number] = [112, 3]
  const expected = 115
  console.log('Running test with args:', args)
  assertEquals(add(...args), expected)
})

Deno.test("test argon2 hash", async function() {
  const result = await testArgon2()
  assertEquals(result, true)
})
