import { assertEquals } from '@std/assert'
import { describe, it, beforeEach, afterEach } from '@std/testing/bdd'
// import { beforeAll, afterAll } from '@std/testing/bdd'
import { add, testArgon2 } from './deno_utils.ts'

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

Deno.test("plain Deno.test", function() {
  console.log('I am here in the plain Deno.test')
  assertEquals(true, true)
})

describe("BDD style tests", () => {
  beforeEach(() => {
    console.log('Running before each test')
  })

  afterEach(() => {
    console.log('Running after each test')
  })

  it("should complete test 1", () => {
    console.log('Running test 1')
    assertEquals(1 + 1, 2)
  })

  it("should complete test 2", () => {
    console.log('Running test 2')
    assertEquals(2 * 2, 4)
  })
})