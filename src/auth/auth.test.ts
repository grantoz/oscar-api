import { test } from 'node:test'
import { assert, assertEquals, assertGreater } from '@/util/assert.ts'
import ky from 'ky'
const encodeBase64 = (value: string) => Buffer.from(value).toString('base64')
import { verifyAndDecodeJwt } from '@middleware'
import { testUsers } from '@/util/test.ts'
const port = process.env['PORT'] ?? 8001

const { superUser } = testUsers

test.skip('should get JSON using ky', async () => {
  type postComment = {
    userId: number
    id: number
    title: string
    body: string
  }
  const data: Array<postComment> = await ky(
    'https://jsonplaceholder.typicode.com/posts/1/comments',
  ).json()
  assertGreater(data.length, 0)
  assertEquals(data[0].id, 1)
  console.log(data)
})

test('should log not super user in with bad password', async () => {
  const auth = encodeBase64(superUser.email + ':' + 'bogus')
  await ky.post(`http://localhost:${port}/auth/login`, {
    headers: {
      Authorization: 'Basic ' + auth,
    },
    throwHttpErrors: false,
  }).then(async (resp) => {
    await resp.body?.cancel()
    assertEquals(401, resp.status)
  })
})

test('should log not super user in with bad email', async () => {
  const auth = encodeBase64('bogus@foo.com' + ':' + superUser.pass)
  const resp = await ky.post(`http://localhost:${port}/auth/login`, {
    headers: {
      Authorization: 'Basic ' + auth,
    },
    throwHttpErrors: false,
  })
  await resp.body?.cancel()
  assertEquals(401, resp.status)
})

interface tokenResponse {
  token: string
}

test('should log super user in and be returned a JWT and refreshToken', async () => {
  const auth = encodeBase64(superUser.email + ':' + superUser.pass)
  const resp = await ky.post(`http://localhost:${port}/auth/login`, {
    headers: {
      Authorization: 'Basic ' + auth,
    },
  })
  const json = await resp.json() as tokenResponse
  assert(json)
  const token = await verifyAndDecodeJwt(json.token)
  assertEquals(token.email, superUser.email)
  // TODO get refresh token from set-cookie response
})

const loginAsSuper = async (): Promise<string> => {
  const auth = encodeBase64(superUser.email + ':' + superUser.pass)
  const resp = await ky.post(`http://localhost:${port}/auth/login`, {
    headers: {
      Authorization: 'Basic ' + auth,
    },
  })
  const json = await resp.json() as tokenResponse
  return json.token
}

test('should reject logout without a valid bearer token', async () => {
  const resp = await ky.post(`http://localhost:${port}/auth/logout`, {
    throwHttpErrors: false,
  })
  await resp.body?.cancel()
  assertEquals(401, resp.status)
})

test('should log out, clear the refresh cookie and revoke the token', async () => {
  const token = await loginAsSuper()

  const resp = await ky.post(`http://localhost:${port}/auth/logout`, {
    headers: {
      Authorization: 'Bearer ' + token,
    },
    throwHttpErrors: false,
  })
  await resp.body?.cancel()
  assertEquals(200, resp.status)

  // the refresh cookie must be unset on the same path it was created for
  const cookie = resp.headers.get('set-cookie') ?? ''
  assert(
    cookie.startsWith('refresh='),
    `expected refresh cookie, got: ${cookie}`,
  )
  assert(
    cookie.includes('Max-Age=0'),
    `expected cookie to be cleared, got: ${cookie}`,
  )
  assert(
    cookie.includes('Path=/auth/refresh'),
    `expected cookie path, got: ${cookie}`,
  )

  // the now-revoked token must no longer be accepted (removed from the kv login store)
  const revoked = await ky.post(`http://localhost:${port}/auth/logout`, {
    headers: {
      Authorization: 'Bearer ' + token,
    },
    throwHttpErrors: false,
  })
  await revoked.body?.cancel()
  assertEquals(401, revoked.status)
})
