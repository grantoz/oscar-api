import { assert, assertEquals, assertGreater } from '@std/assert'
import ky from 'ky'
import { encodeBase64 } from "@std/encoding/base64";
import { verifyAndDecodeJwt } from './jwt.ts'
import { testUsers } from '@/util/test.ts'

const port = Deno.env.get('PORT') ?? 8001

const { superUser } = testUsers

Deno.test.ignore("should get JSON using ky", async () => {
  type postComment = {
    userId: number,
    id: number,
    title: string,
    body: string
  }
  const data: Array<postComment> = await ky('https://jsonplaceholder.typicode.com/posts/1/comments').json()
  assertGreater(data.length, 0)
  assertEquals(data[0].id, 1)
  console.log(data)
})

Deno.test("should log not super user in with bad password", async () => {
  const auth = encodeBase64(superUser.email + ':' + 'bogus')
  await ky.post(`http://localhost:${port}/auth/login`, {
    headers: {
      Authorization: 'Basic ' + auth
    },
    throwHttpErrors: false
  }).then(async (resp) => {
    await resp.body?.cancel()
    assertEquals(401, resp.status)
  })
})

Deno.test("should log not super user in with bad email", async () => {
  const auth = encodeBase64('bogus@foo.com' + ':' + superUser.pass)
  const resp = await ky.post(`http://localhost:${port}/auth/login`, {
    headers: {
      Authorization: 'Basic ' + auth
    },
    throwHttpErrors: false
  })
  await resp.body?.cancel()
  assertEquals(401, resp.status)
})

interface tokenResponse {
  token: string
}

Deno.test("should log super user in and be returned a JWT and refreshToken", async () => {
  const auth = encodeBase64(superUser.email + ':' + superUser.pass)
  const resp = await ky.post(`http://localhost:${port}/auth/login`, {
    headers: {
      Authorization: 'Basic ' + auth
    },
  })
  const json = await resp.json() as tokenResponse
  assert(json)
  const token = await verifyAndDecodeJwt(json.token)
  assertEquals(token.email, superUser.email)
  // TODO get refresh token from set-cookie response
})
