import { assertEquals, assertGreater, assertInstanceOf } from '@std/assert'
import ky from 'ky'
import { superEmail, superPass } from '../../prisma/seed/user.ts'
import { encodeBase64 } from "@std/encoding/base64";
import { object } from '@zod'

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
  const auth = encodeBase64(superEmail + ':' + 'bogus')
  const port = Deno.env.get('PORT') ?? ''
  const response = await ky.post(`http://localhost:${port}/auth/login`, {
    headers: {
      Authorization: 'Basic ' + auth
    },
    throwHttpErrors: false
  })
  assertEquals(401, response.status)
})

Deno.test("should log not super user in with bad email", async () => {
  const auth = encodeBase64('bogus@foo.com' + ':' + superPass)
  const port = Deno.env.get('PORT') ?? ''
  const response = await ky.post(`http://localhost:${port}/auth/login`, {
    headers: {
      Authorization: 'Basic ' + auth
    },
    throwHttpErrors: false
  })
  assertEquals(401, response.status)
})

Deno.test("should log super user in and be returned a JWT and refreshToken", async () => {
  const auth = encodeBase64(superEmail + ':' + superPass)
  const port = Deno.env.get('PORT') ?? ''
  const login: object = await ky.post(`http://localhost:${port}/auth/login`, {
    headers: {
      Authorization: 'Basic ' + auth
    },
  }).json()
  assertInstanceOf(login, Object)
  // TODO decode jwt, validate correctness
  // TODO assert existence of refresh cookie, validate correctness
  console.log(login)
})
