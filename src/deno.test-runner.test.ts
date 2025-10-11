import { load } from "@std/dotenv";
import { assertEquals, assertGreater } from '@std/assert'
import { describe, it, beforeEach, afterEach, beforeAll, afterAll } from '@std/testing/bdd'
import { add, testArgon2 } from './deno_utils.ts'
import ky from 'ky'
import { superEmail, superPass } from '../prisma/seed/user.ts'
import { encodeBase64 } from "@std/encoding/base64";

await load({
  envPath: '.env.test',
  export: true
});
const port = Deno.env.get('PORT') || 8000

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
  beforeAll(() => {
    console.log('Running before all tests')
  })

  afterAll(() => {
    console.log('Running after all tests')
  })

  beforeEach(() => {
    console.log('Running before each test')
  })

  afterEach(() => {
    console.log('Running after each test')
  })

  it("should complete test 1", () => {
    assertEquals(1 + 1, 2)
  })

  it("should get JSON using ky", async () => {
    const data: any = await ky('https://jsonplaceholder.typicode.com/posts/1/comments').json()
    // assertInstanceOf(data, Object)
    assertGreater(data.length, 0)
    assertEquals(data[0].id, 1)
    console.log(data)
  })

  it("should log super user in", async () => {
    const auth = encodeBase64(superEmail + ':' + superPass)
    const login: object = await ky.post(`http://localhost:${port}/auth/login`, {
      headers: {
        Authorization: 'Basic ' + auth
      }
    }).json()
    console.log(login)
  })
})